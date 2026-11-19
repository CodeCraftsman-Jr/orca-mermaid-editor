#!/bin/sh
# Rebuild editor/index.html from the template + the trimmed mermaid bundle.
#
# Size history: the trimmed Mermaid runtime was about 1.2MB. Adding offline
# ELK makes this local build about 2.9MB; catalog publication needs a size review.
# The frame CSP allows inline scripts only, so the bundle is
# still inlined; <!-- sequences are escaped to keep the host HTML parser from
# entering comment mode and truncating the script block.
#
# Excluded types (rendering them raises a clear not-included error):
#   architecture, block, c4, kanban, mindmap, sankey, packet, xychart,
#   quadrant, requirement, journey, info, timeline, radiation, math (KaTeX)
set -e
cd "$(dirname "$0")"
node build.mjs
