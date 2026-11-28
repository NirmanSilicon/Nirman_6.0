from __future__ import annotations

import importlib
import streamlit as st
import pandas as pd
import plotly.express as px

import src.embedder as emb
import src.ner_extractor as ner
import src.knowledge_graph as kg
import src.summarizer as summ
importlib.reload(emb)
importlib.reload(ner)
importlib.reload(kg)
importlib.reload(summ)

from src.pdf_processor import extract_pdf_pages
from src.text_processor import chunk_extracted_pages
from src.embedder import generate_embeddings, semantic_search
from src.ner_extractor import extract_entities_from_chunks
from src.knowledge_graph import build_knowledge_graph, get_learning_roadmap, create_concept_mindmap
from src.conflict_detector import detect_potential_conflicts
from src.timeline_extractor import extract_timeline_events
from src.summarizer import generate_study_guide, compute_narrative_pacing
from src.matrix_builder import build_comparative_matrix

# Page configuration
st.set_page_config(
    page_title="LEXICON — Literature & Study Copilot",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS
st.markdown("""
<style>
    .metric-card {
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 15px 20px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .metric-value {
        font-size: 28px;
        font-weight: 700;
        color: #1f77b4;
    }
    .metric-label {
        font-size: 13px;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .guide-box {
        background-color: #eef6fc;
        border-left: 4px solid #1f77b4;
        padding: 12px 16px;
        border-radius: 4px;
        margin-bottom: 20px;
        font-size: 14px;
        color: #1c4966;
    }
</style>
""", unsafe_allow_html=True)

# Session state initialization
if "all_pages" not in st.session_state:
    st.session_state.all_pages = []
if "all_chunks" not in st.session_state:
    st.session_state.all_chunks = []
if "chunk_embeddings" not in st.session_state:
    st.session_state.chunk_embeddings = None
if "entities" not in st.session_state:
    st.session_state.entities = []
if "mastered_concepts" not in st.session_state:
    st.session_state.mastered_concepts = set()

# Sidebar Navigation & Upload
with st.sidebar:
    st.title("🎓 LEXICON")
    st.caption("Offline Literature & Study Copilot")
    st.divider()

    st.subheader("📚 Course Readings & Texts")
    uploaded_files = st.file_uploader(
        "Upload Novels, Plays, Essays, or PDFs",
        type=["pdf"],
        accept_multiple_files=True,
    )

    if st.button("🚀 Build Study Workspace", width="stretch", type="primary") and uploaded_files:
        st.session_state.all_pages = []
        st.session_state.all_chunks = []
        st.session_state.chunk_embeddings = None
        st.session_state.entities = []
        st.session_state.mastered_concepts = set()

        with st.spinner("Analyzing characters, motifs, and passages..."):
            all_pages = []
            for file in uploaded_files:
                file_bytes = file.read()
                pages = extract_pdf_pages(file_bytes, file.name)
                all_pages.extend(pages)

            st.session_state.all_pages = all_pages

            chunks = chunk_extracted_pages(all_pages)
            st.session_state.all_chunks = chunks

            if chunks:
                texts = [c["text"] for c in chunks]
                embeddings = generate_embeddings(texts)
                st.session_state.chunk_embeddings = embeddings
                entities = extract_entities_from_chunks(chunks)
                st.session_state.entities = entities

        st.success(f"Workspace ready with {len(uploaded_files)} text(s)!")

    st.divider()
    st.markdown("### ⚡ Low-RAM Optimized Mode")
    st.caption("🟢 Cached Models (`@st.cache_resource`)")
    st.caption("🟢 `float16` Vector Compression (-75% RAM)")
    st.caption("🟢 100% Offline CPU Execution")

# Header Section
st.title("🎓 Literature & Study Intelligence Workspace")
st.markdown("Explore character networks, literary devices, narrative pacing arcs, flashcards, and essay citations—100% offline.")

# Metrics Row
if st.session_state.all_pages:
    doc_count = len({p["document_name"] for p in st.session_state.all_pages})
    page_count = len(st.session_state.all_pages)
    chunk_count = len(st.session_state.all_chunks)
    char_count = len({e["entity_text"].lower() for e in st.session_state.entities if e["entity_label"] == "PERSON"})

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{doc_count}</div><div class="metric-label">Texts Loaded</div></div>', unsafe_allow_html=True)
    with m2:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{page_count}</div><div class="metric-label">Total Pages</div></div>', unsafe_allow_html=True)
    with m3:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{chunk_count}</div><div class="metric-label">Passages Indexed</div></div>', unsafe_allow_html=True)
    with m4:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{char_count}</div><div class="metric-label">People / Characters</div></div>', unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

# Navigation Tabs
tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
    "📚 Reading List",
    "🧠 Notes, Devices & Flashcards",
    "📈 Narrative Tone & Arc",
    "🔍 Essay Quote Finder",
    "🎯 Character & Motif Explorer",
    "⚔️ Critical Perspectives",
    "📅 Chronological Timeline"
])

# Tab 1: Reading List & Comparative Matrix
with tab1:
    st.markdown("### 📚 Loaded Texts & Quick Citations")
    if st.session_state.all_pages:
        st.markdown('<div class="guide-box">Overview of your loaded readings along with ready-to-use in-text citation prefixes for essays.</div>', unsafe_allow_html=True)
        doc_stats = {}
        for p in st.session_state.all_pages:
            name = p["document_name"]
            if name not in doc_stats:
                clean_cite = name.replace(".pdf", "")
                doc_stats[name] = {
                    "Text File": name,
                    "Pages": 0,
                    "In-Text Citation Format": f"({clean_cite}, p. X)",
                    "Document Hash": p["document_id"]
                }
            doc_stats[name]["Pages"] += 1
        df_docs = pd.DataFrame(list(doc_stats.values()))
        st.dataframe(df_docs, width="stretch", hide_index=True)

        st.markdown("#### 📊 Cross-Text Study Comparison")
        matrix_df = build_comparative_matrix(st.session_state.all_chunks, st.session_state.all_pages)
        st.dataframe(matrix_df, width="stretch", hide_index=True)
    else:
        st.info("👈 Upload your PDF texts in the sidebar and click **Build Study Workspace** to get started.")

# Tab 2: Notes, Literary Devices & Active Recall Flashcards
with tab2:
    st.markdown("### 🧠 Revision Notes, Literary Devices & Flashcards")
    st.markdown('<div class="guide-box">Review top thematic takeaways, spot literary devices & dialogue quotes, and test yourself with active recall flashcards.</div>', unsafe_allow_html=True)

    if st.session_state.all_chunks:
        study_data = generate_study_guide(st.session_state.all_chunks, num_points=5)

        col_notes, col_cards = st.columns([1.15, 1])

        with col_notes:
            st.subheader("📌 Key Thematic Takeaways")
            for idx, item in enumerate(study_data["takeaways"], start=1):
                st.info(f"**{idx}.** {item['text']}")
                st.caption(f"📖 Cite as: `{item['citation']}`")

            st.subheader("✒️ Literary Device & Dialogue Bank")
            if study_data["literary_devices"]:
                for dev in study_data["literary_devices"]:
                    with st.expander(f"{dev['device']} — {dev['citation']}"):
                        st.write(f"*{dev['quote']}*")
                        st.code(f"{dev['quote']} {dev['citation']}", language=None)
            else:
                st.caption("No dialogue quotes or similes detected in this sample.")

        with col_cards:
            st.subheader("🗂️ Active Recall Flashcards")
            if study_data["flashcards"]:
                for idx, card in enumerate(study_data["flashcards"], start=1):
                    with st.expander(f"Card #{idx} [{card['type']}]: {card['question']}"):
                        st.success(card["answer"])
                        st.caption(f"📖 Source: `{card['citation']}`")
            else:
                st.info("Not enough explanatory sentences found to generate flashcards.")
    else:
        st.info("Upload texts to generate revision notes, literary devices, and flashcards.")

# Tab 3: Narrative Tone & Pacing Arc
with tab3:
    st.markdown("### 📈 Narrative Tone & Dramatic Pacing Curve")
    st.markdown('<div class="guide-box">Track how emotional tone (positive vs. tense/conflict language) shifts from passage to passage across your readings.</div>', unsafe_allow_html=True)

    if st.session_state.all_chunks:
        arc_data = compute_narrative_pacing(st.session_state.all_chunks)
        df_arc = pd.DataFrame(arc_data)

        fig_arc = px.line(
            df_arc,
            x="Passage #",
            y="Emotional Tone",
            color="Document",
            markers=True,
            hover_data=["Page", "Dramatic Intensity", "Preview"],
            title="Emotional Tone Progression Across Passages (+ Positive / - Conflict)"
        )
        fig_arc.add_hline(y=0, line_dash="dash", line_color="gray")
        st.plotly_chart(fig_arc, width="stretch")
    else:
        st.info("Upload texts to visualize the narrative tone curve.")

# Tab 4: Essay Quote Finder
with tab4:
    st.markdown("### 🔍 Essay Evidence & Quote Finder")
    st.markdown('<div class="guide-box">Type a theme, character trait, or essay argument below to find matching textual evidence with copy-pasteable citations.</div>', unsafe_allow_html=True)

    col_q, col_k = st.columns([4, 1])
    with col_q:
        query = st.text_input("What theme or argument are you writing about?", placeholder="e.g., How do parks and trees affect summer heat?")
    with col_k:
        top_k = st.selectbox("Quotes", [3, 5, 8], index=0)

    if query and st.session_state.all_chunks:
        results = semantic_search(
            query,
            st.session_state.all_chunks,
            st.session_state.chunk_embeddings,
            top_k=top_k,
        )
        for res in results:
            score = res["similarity_score"]
            clean_cite = f"({res['document_name'].replace('.pdf', '')}, p. {res['page_number']})"
            with st.expander(f"📄 {res['document_name']} — Page {res['page_number']} (Relevance: {score:.1%})", expanded=True):
                st.write(f'"{res["text"]}"')
                st.code(f'"{res["text"]}" {clean_cite}', language=None)
    elif query:
        st.warning("Please upload and process your texts first.")

# Tab 5: Interactive Character, Setting & Motif Explorer
with tab5:
    st.markdown("### 🎯 Interactive Character, Setting & Motif Explorer")
    st.markdown('<div class="guide-box">Follow your guided study path. Select any Character, Setting, or Motif to view its radial relationship map (including scene co-occurrences), read key excerpts, and test your mastery!</div>', unsafe_allow_html=True)

    if st.session_state.all_chunks and st.session_state.entities:
        G = build_knowledge_graph(st.session_state.all_chunks, st.session_state.entities)
        roadmap = get_learning_roadmap(G, max_topics=10)

        if roadmap:
            total_topics = len(roadmap)
            mastered_count = sum(1 for t in roadmap if t["node_id"] in st.session_state.mastered_concepts)
            progress_pct = mastered_count / total_topics
            st.progress(progress_pct, text=f"🏆 Literature Mastery Progress: {mastered_count} of {total_topics} Key Elements Mastered ({progress_pct:.0%})")
            st.divider()

            col_path, col_lesson = st.columns([1.15, 2])

            with col_path:
                st.subheader("🗺️ Study Roadmap")
                badge_map = {"PERSON": "👤", "GPE": "📍", "LOC": "📍", "ORG": "🏛️", "MOTIF": "🏷️"}
                topic_labels = [
                    f"{'✅' if t['node_id'] in st.session_state.mastered_concepts else badge_map.get(t['entity_label'], '📘')} {t['label']} ({t['stage'].split(':')[0]})"
                    for t in roadmap
                ]
                selected_idx = st.radio(
                    "Choose a Character, Place, or Motif:",
                    range(len(roadmap)),
                    format_func=lambda i: topic_labels[i]
                )
                active_topic = roadmap[selected_idx]

            with col_lesson:
                focus_id = active_topic["node_id"]
                topic_name = active_topic["label"]

                c_head, c_btn = st.columns([3, 1.3])
                with c_head:
                    st.subheader(f"{active_topic['stage']}: {topic_name}")
                with c_btn:
                    is_done = focus_id in st.session_state.mastered_concepts
                    if is_done:
                        if st.button("✅ Mastered (Undo)", key=f"btn_{focus_id}", width="stretch"):
                            st.session_state.mastered_concepts.remove(focus_id)
                            st.rerun()
                    else:
                        if st.button("🎯 Mark as Mastered", key=f"btn_{focus_id}", type="primary", width="stretch"):
                            st.session_state.mastered_concepts.add(focus_id)
                            st.rerun()

                fig = create_concept_mindmap(G, focus_id, st.session_state.mastered_concepts)
                st.plotly_chart(fig, width="stretch")

                st.markdown("#### 💡 Textual Context & Scene Excerpts")
                matching_chunks = [
                    c for c in st.session_state.all_chunks
                    if topic_name.lower() in c["text"].lower()
                ]

                if matching_chunks:
                    for ch in matching_chunks[:2]:
                        st.info(f"**From {ch['document_name']} (p. {ch['page_number']}):** {ch['text']}")

                    st.markdown("#### ❓ Quick Recall Check")
                    quiz_chunk = matching_chunks[0]
                    masked_sentence = quiz_chunk["text"].replace(topic_name, "________").replace(topic_name.lower(), "________")
                    st.write(f"**Identify the missing element:** *\"{masked_sentence}\"*")
                    with st.expander("👀 Reveal Answer"):
                        st.success(f"**Answer:** {topic_name}")
                        st.caption(f"Source: {quiz_chunk['document_name']}, Page {quiz_chunk['page_number']}")
                else:
                    st.info("No direct paragraph snippets found for this term.")
        else:
            st.info("Not enough elements extracted to build a study path.")
    else:
        st.info("Upload texts to generate your interactive character & motif explorer.")

# Tab 6: Critical Perspectives
with tab6:
    st.markdown("### ⚔️ Critical Analysis & Contrasting Perspectives")
    st.markdown('<div class="guide-box">Spot where texts present contrasting viewpoints, conflicting claims, or differing evidence—ideal for critical essays.</div>', unsafe_allow_html=True)

    threshold = st.slider("Topic Match Sensitivity", min_value=0.3, max_value=0.8, value=0.45, step=0.05)

    if st.session_state.all_chunks and st.session_state.chunk_embeddings is not None:
        conflicts = detect_potential_conflicts(
            st.session_state.all_chunks,
            st.session_state.chunk_embeddings,
            similarity_threshold=threshold,
        )

        if conflicts:
            st.warning(f"Found {len(conflicts)} critical comparison point(s) across your texts.")
            for idx, conf in enumerate(conflicts, start=1):
                st.markdown(f"#### Point #{idx}: {conf['conflict_reason']} (Topic Match: {conf['similarity_score']:.1%})")
                col_a, col_b = st.columns(2)

                with col_a:
                    st.markdown(f"**📄 Perspective A:** `{conf['source_chunk_a']['document_name']}` (p. {conf['source_chunk_a']['page_number']})")
                    st.info(f'"{conf["source_chunk_a"]["text"]}"')

                with col_b:
                    st.markdown(f"**📄 Perspective B:** `{conf['source_chunk_b']['document_name']}` (p. {conf['source_chunk_b']['page_number']})")
                    if "Negation" in conf["conflict_reason"]:
                        st.error(f'"{conf["source_chunk_b"]["text"]}"')
                    else:
                        st.info(f'"{conf["source_chunk_b"]["text"]}"')
                st.divider()
        else:
            st.success("No major contradictions detected at this sensitivity level.")
    else:
        st.info("Upload at least two texts to compare perspectives.")

# Tab 7: Chronological Timeline
with tab7:
    st.markdown("### 📅 Chronological Timeline")
    st.markdown('<div class="guide-box">Track dates and chronological events across your readings.</div>', unsafe_allow_html=True)

    if st.session_state.all_chunks:
        timeline_events = extract_timeline_events(st.session_state.all_chunks)
        if timeline_events:
            for event in timeline_events:
                col_yr, col_txt = st.columns([1, 5])
                with col_yr:
                    st.subheader(f"🗓️ {event['year']}")
                with col_txt:
                    st.markdown(f"**Context:** {event['context_text']}")
                    st.caption(f"📖 Source: **{event['document_name']}**, Page {event['page_number']}")
                    st.divider()
        else:
            st.info("No explicit year references detected in your texts.")
    else:
        st.info("Upload texts to build a chronological timeline.")