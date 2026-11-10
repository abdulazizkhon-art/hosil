"""Hosil demo on Streamlit.

The demo itself is plain HTML/CSS/JS (index.html, css/, js/). This file only bundles those
files into one page and shows it inside Streamlit, either as one window or as two windows
side by side so the live sync between the restaurant and the farmer is visible on one screen.

Run locally:  streamlit run streamlit_app.py
"""
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).parent
SPLIT = "Split screen: restaurant + farmer"
SINGLE = "Single window"

st.set_page_config(page_title="Hosil · Farm to restaurant", page_icon="🌱", layout="wide", initial_sidebar_state="collapsed")


def assets() -> tuple[str, str, str]:
    read = lambda p: (ROOT / p).read_text(encoding="utf-8")
    return read("css/styles.css"), read("js/data.js"), read("js/app.js")


def demo_page(start: str, zoom: float = 1.0) -> str:
    """One self-contained copy of the demo that opens on the given route."""
    css, data_js, app_js = assets()
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>{css}
html {{ zoom: {zoom}; }}
.shell {{ min-height: calc(100vh / {zoom}); }}
.side {{ height: calc(100vh / {zoom}); }}</style></head>
<body><div id="app"></div><div id="modal"></div><div id="toasts" class="toasts"></div>
<script>window.HOSIL_EMBED = true; window.HOSIL_START = "{start}";</script>
<script>{data_js}</script>
<script>{app_js}</script>
</body></html>"""


# Strip Streamlit's own chrome so the demo fills the screen.
st.markdown(
    """<style>
    header[data-testid="stHeader"], footer, #MainMenu { display: none !important; }
    .block-container { padding: 0.6rem 0.8rem 0 !important; max-width: 100% !important; }
    div[data-testid="stVerticalBlock"] { gap: 0.5rem; }
    iframe { height: calc(100vh - 70px) !important; border: 1px solid #E3E7DE; border-radius: 12px; }
    </style>""",
    unsafe_allow_html=True,
)

view = st.segmented_control("View", [SPLIT, SINGLE], default=SPLIT, label_visibility="collapsed") or SPLIT

if view == SPLIT:
    left, right = st.columns(2, gap="small")
    with left:
        components.html(demo_page("#/restaurant", zoom=0.75), height=800, scrolling=True)
    with right:
        components.html(demo_page("#/farmer", zoom=0.75), height=800, scrolling=True)
else:
    components.html(demo_page("#/"), height=800, scrolling=True)
