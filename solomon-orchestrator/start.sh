#!/bin/bash
# Solomon Orchestrator — Start All Services
# Run: bash /home/workspace/Skills/solomon-orchestrator/start.sh

echo "🚀 Starting Solomon Orchestrator..."

# Channel Router (Telegram polling)
echo "📡 Starting Channel Router..."
nohup bun /home/workspace/Skills/solomon-orchestrator/scripts/solomon-router.ts \
  >> /dev/shm/solomon-router.log 2>&1 &
echo "   PID: $!"

# Webhook Trigger Server
echo "🪝 Starting Webhook Trigger Server..."
nohup bun /home/workspace/Skills/solomon-orchestrator/scripts/solomon-webhook-trigger.ts \
  >> /dev/shm/solomon-webhook-trigger.log 2>&1 &
echo "   PID: $!"

echo ""
echo "✅ All services started"
echo "   Router:     $(pgrep -f solomon-router || echo 'not running')"
echo "   Webhook:    $(pgrep -f solomon-webhook-trigger || echo 'not running')"
echo ""
echo "Logs:"
echo "  tail -f /dev/shm/solomon-router.log"
echo "  tail -f /dev/shm/solomon-webhook-trigger.log"
