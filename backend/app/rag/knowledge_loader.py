# backend/app/rag/knowledge_loader.py
"""Knowledge Loader for RAG system.

This module reads all markdown (.md) files from the project's knowledge base,
chunks them into manageable pieces, creates embeddings using a lightweight
sentence transformer, builds a FAISS index, and persists the index together
with simple metadata for later retrieval.
"""

import os
import glob
import json
from pathlib import Path
from typing import List, Tuple

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# Configuration constants – can be tuned later
KB_ROOT = Path(__file__).resolve().parents[2] / "knowledge_base"
INDEX_PATH = Path(__file__).resolve().parents[1] / "faiss_index.faiss"
METADATA_PATH = Path(__file__).resolve().parents[1] / "faiss_metadata.json"
CHUNK_SIZE = 500  # characters per chunk (simple heuristic)


def _read_markdown_files() -> List[Tuple[str, str]]:
    """Read all ``.md`` files under :data:`KB_ROOT`.

    Returns
    -------
    List[Tuple[str, str]]
        A list of ``(file_path, file_contents)`` tuples.
    """
    markdown_files = glob.glob(str(KB_ROOT / "**" / "*.md"), recursive=True)
    documents = []
    for fp in markdown_files:
        with open(fp, "r", encoding="utf-8") as f:
            documents.append((fp, f.read()))
    return documents


def _simple_chunk(text: str, size: int = CHUNK_SIZE) -> List[str]:
    """Split *text* into fixed‑size character chunks.

    The function tries to split on newlines first for readability, falling back
    to a pure character slice when a chunk would otherwise be empty.
    """
    if not text:
        return []
    # Prefer splitting on double newlines (paragraphs)
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= size:
            # +2 accounts for the ``\n\n`` that will be added when joining
            current = (current + "\n\n" + para).strip() if current else para.strip()
        else:
            if current:
                chunks.append(current)
            # If a single paragraph exceeds the size, break it forcibly
            if len(para) > size:
                for i in range(0, len(para), size):
                    chunks.append(para[i : i + size].strip())
                current = ""
            else:
                current = para.strip()
    if current:
        chunks.append(current)
    return chunks


class KnowledgeLoader:
    """Load knowledge base, embed chunks, and build a FAISS vector store."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.metadata: List[dict] = []  # each entry maps ``id`` -> ``{'source': ..., 'text': ...}``

    def build(self) -> None:
        """Read markdown files, chunk them, embed, and build the FAISS index.

        The resulting index and metadata are persisted to disk for later use by
        :pymod:`retriever`.
        """
        documents = _read_markdown_files()
        all_chunks: List[str] = []
        for path, content in documents:
            chunks = _simple_chunk(content)
            for chunk in chunks:
                self.metadata.append({"source": path, "text": chunk})
                all_chunks.append(chunk)

        if not all_chunks:
            raise ValueError("No markdown content found to build the vector store.")

        # Generate embeddings
        embeddings = self.model.encode(all_chunks, normalize_embeddings=True)
        embeddings = np.asarray(embeddings).astype("float32")

        # Create a FAISS index (inner product for normalized vectors -> cosine similarity)
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)

        # Persist index and metadata
        faiss.write_index(self.index, str(INDEX_PATH))
        with open(METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)

    @staticmethod
    def load_existing() -> "KnowledgeLoader":
        """Load a previously stored FAISS index and metadata.

        If the index or metadata file is missing, compiles them automatically.

        Returns
        -------
        KnowledgeLoader
            An instance with ``index`` and ``metadata`` populated.
        """
        loader = KnowledgeLoader()
        if not INDEX_PATH.is_file() or not METADATA_PATH.is_file():
            print("FAISS index or metadata not found. Building from markdown files...")
            loader.build()
        else:
            loader.index = faiss.read_index(str(INDEX_PATH))
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                loader.metadata = json.load(f)
        return loader

    def embed_query(self, query: str) -> np.ndarray:
        """Embed a query string using the same transformer model.

        Returns
        -------
        np.ndarray
            Normalised embedding vector with shape ``(1, dim)``.
        """
        vec = self.model.encode([query], normalize_embeddings=True)
        return np.asarray(vec).astype("float32")
