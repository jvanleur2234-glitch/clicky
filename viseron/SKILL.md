---
name: viseron
description: Self-hosted NVR with AI CV. Object detection, face recognition, YOLO, TensorFlow, Google Coral, EdgeTPU. No cloud. For Solomon Ring — privacy-first doorbell/camera system.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
---

# Viseron — Self-Hosted NVR

Source: github.com/AuraLightNZ/viseron

## What It Does
- Object detection (persons, vehicles, animals)
- Face recognition (local, no cloud)
- Motion-triggered recording
- Hardware: Raspberry Pi + Coral USB + IP cameras

## For Solomon Ring
Privacy-first security camera system. Competitors (Ring, Nest) send data to cloud. Viseron keeps everything local.

## Quick Start
```bash
docker run -d --name viseron \
  -v /etc/viseron:/config \
  -v /var/viseron:/var/viseron \
  --device /dev/video0 --privileged \
  auralightnz/viseron
```

## Next Steps
- Test on Raspberry Pi with Coral USB
- Integrate with JackConnect for property monitoring
- Add motion alerts → Telegram via Hermes