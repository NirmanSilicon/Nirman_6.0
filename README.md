# Ferrosphile

A low-cost, multi-terrain metallic ore detection probe.
Team Magic Monks, HackNation 2026 (Robotics & Automation).

![Ferrosphile carrier PCB](hardware/docs/pcb-front.png)

This repo holds the **hardware design**: schematic, PCB and files to order the board.


## How the probe senses

- **Metal-sensing coil:** an LC oscillator runs at about 42 kHz. Metal near the coil shifts the frequency.
- **Two compass chips (gradiometer):** one in the probe tip, one about 30 cm higher. Bottom minus top cancels Earth's field and leaves the field of nearby magnetic ore.
- **Tilt chip:** corrects for how the probe is held.
- **ESP32 DevKit:** reads all three and sends the readings to a laptop over USB.


## Repo layout

```
hardware/
  kicad/          KiCad 8 project (open ferrosphile.kicad_pro)
  fabrication/    Gerbers zip + BOM
  docs/           schematic PDF/SVG/PNG, PCB previews, layout PDF
  scripts/        scripts that generated the KiCad project
```

Pin map, ordering settings, assembly steps and coil details: [hardware/README.md](hardware/README.md)

Schematic: [hardware/docs/ferrosphile-schematic.pdf](hardware/docs/ferrosphile-schematic.pdf)


