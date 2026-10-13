# Elevator Simulator Implementation Plan
Goal: a usable simulator combining the supplied model and a controller.
Architecture: deterministic controller engine separate from Three.js rendering and UI; Blender assets exported with role metadata.
Tech: Blender 5.2, Three.js, vanilla JS/CSS, Node tests, esbuild static output.
Spec: design.md
Global constraints: preserve original model, Korean UI, 15 floors, local geometry, no backend.
Review focus: unsafe door opening while travelling; calls after braking commitment; reverse-direction hall calls; paused/background tab clocks; render load failure.
1. Write engine behavior tests, run failing. Implement controller state machine and dispatch; pass the suite.
2. Add and save controller cabinet and integrated Blender file. Export GLB with car, doors, landings and controller role metadata; validate node counts.
3. Build functional 3D workspace with controls, statuses and event log. Bundle dependencies locally. Test browser controls and mobile layout.
4. Review controller and integration, fix evidenced issues. Publish private Site; package model, app source and usage instructions.
Execution: inline in this task; user has asked to perform the work. No additional approval gate for reversible implementation.
