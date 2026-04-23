# 🧬 TriageLens

### AI-Powered Emergency Triage Co-Pilot with Explainable Reasoning

---

## Overview

**TriageLens** is an AI-powered clinical decision support tool that helps emergency department nurses and paramedics assess patient acuity using the **Emergency Severity Index (ESI)** — the gold standard 5-level triage system used in hospitals worldwide.

Emergency departments misclassify triage severity approximately 30% of the time. Undertriage can be fatal. Overtriage wastes critical beds and resources. TriageLens provides a real-time AI "second opinion" by synthesizing patient vitals, chief complaint text, and clinical indicators into an ESI prediction — with fully transparent, step-by-step reasoning that a nurse can audit in seconds.

---

## Key Features

- **Patient Intake System** — Structured vitals input (heart rate, blood pressure, SpO2, temperature, pain scale) combined with free-text chief complaint entry
- **AI Triage Engine** — LLM-powered ESI level prediction (1–5) using chain-of-thought clinical reasoning based on official ESI guidelines
- **Explainability Panel** — Visual factor contribution analysis showing exactly *why* each clinical indicator pushed the acuity score up or down
- **Live Patient Queue** — Kanban-style dashboard with all patients ranked by predicted acuity, color-coded by ESI level (Red → Orange → Yellow → Green → Blue)
- **Simulation Mode** — Auto-generates realistic patient scenarios for training, demos, and evaluation without requiring real patient data
- **Reasoning Trace** — Live-streamed, step-by-step clinical reasoning that appears in real-time as the AI thinks through each case

---

## How It Works

1. A nurse or paramedic enters patient information — vitals and chief complaint
2. TriageLens constructs a clinical assessment prompt with embedded ESI guidelines
3. The AI analyzes the case using chain-of-thought reasoning across 4 clinical decision steps
4. Results display the predicted ESI level, confidence score, full reasoning trace, and factor contribution analysis
5. The patient is added to a live queue board sorted by acuity for at-a-glance department awareness

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS |
| Visualization | Recharts |
| AI Engine | Anthropic Claude API (Sonnet) |
| Architecture | Single-page application, no backend required |

---

## ESI Levels

| Level | Name | Color | Description |
|-------|------|-------|-------------|
| ESI 1 | Resuscitation | 🔴 Red | Immediate life-saving intervention needed |
| ESI 2 | Emergent | 🟠 Orange | High risk, confused/lethargic, or severe distress |
| ESI 3 | Urgent | 🟡 Yellow | Two or more resources needed |
| ESI 4 | Less Urgent | 🟢 Green | One resource needed |
| ESI 5 | Non-Urgent | 🔵 Blue | No resources needed |

---

## Target Users

- Emergency department nurses
- Paramedics and first responders
- Medical students and residents in training
- Healthcare technology researchers
- Clinical decision support system designers

---

## What Makes TriageLens Different

- **Not a chatbot** — it's a structured clinical tool with purpose-built UI
- **Explainable AI** — every prediction shows its full reasoning chain and factor weights
- **Real-world clinical framework** — built on the actual ESI algorithm used in hospitals
- **Visual + interactive** — Kanban queue, animated reasoning trace, factor contribution charts
- **Zero infrastructure** — runs entirely client-side, no backend or database required

---

## Disclaimer

TriageLens is a **demonstration and educational tool**. It is not FDA-approved, not clinically validated, and should never be used as a substitute for professional medical judgment in real emergency settings. All patient scenarios in simulation mode are AI-generated and fictional.

---

## Built By

**Abhiram Varma Nandimandalam** — M.S. Data Science, University of Arizona
Experience in AI, healthcare analytics, and clinical simulation systems.

Built for the **Codex Creator Challenge** by Anthropic.

---

## License

MIT License