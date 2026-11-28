"""
Ashvin — in-vehicle sensor enclosure (parametric CAD model)

What this models
    A two-part, 3D-printable box that sits in the car and holds the crash-detection
    electronics. It is sized around the demo electronics (ESP32 dev board, MPU6050 IMU,
    NEO-6M class GPS module), screws to the vehicle through two base flanges, closes with
    a lip lid held by four M3 screws, and carries the unit's unique code as a printed
    label in a shallow recess on the lid. Openings: USB cutout in the end wall, plus a
    reset-button hole and a status-LED opening in the lid.

What this does NOT model (deliberately — not decided yet, so nothing is assumed)
    - internal board mounting posts / standoffs (component fixing method not decided)
    - the USB connector, LED lens, gasket or any purchased part
    - where exactly the label artwork sits, and the code itself
    - heat, vibration and ingress ratings

How to use
    pip install cadquery
    python ashvin_enclosure.py
    -> writes ashvin_enclosure.step and ashvin_enclosure.stl next to this script.

    Every dimension is a named variable below. Edit and re-run.
    All dimensions in millimetres.
"""

import os

import cadquery as cq
from cadquery import exporters

# =====================================================================================
# INTERNAL COMPONENTS  (what the cavity has to hold)
# =====================================================================================

# Length of the ESP32 dev board along the enclosure's long axis
esp32_board_length = 55.0
# Width of the ESP32 dev board across the enclosure's short axis
esp32_board_width = 28.0
# Length of the NEO-6M class GPS module board
gps_module_length = 25.0
# Width of the NEO-6M class GPS module board
gps_module_width = 25.0
# Length of the MPU6050 (GY-521) IMU module board
imu_module_length = 21.0
# Width of the MPU6050 (GY-521) IMU module board
imu_module_width = 16.0
# Height of the tallest component stack above the floor (ESP32 on header pins with USB plug, GPS with antenna)
tallest_component_height = 13.0
# Free space left above the tallest component for wiring and airflow
top_clearance = 9.0

# =====================================================================================
# WALLS AND CAVITY
# =====================================================================================

# Side wall thickness (2 mm, 3D-printed PLA as chosen)
wall_thickness = 2.0
# Floor thickness of the base part
floor_thickness = 2.0
# Diameter of the four internal corner bosses that take the lid screws
boss_diameter = 7.0
# How far each boss is pushed into the internal wall so the fuse is robust (0 = exactly tangent)
boss_wall_overlap = 0.5
# Gap between the largest board edge and the internal wall — must stay larger than the boss intrusion
component_clearance = 7.5

# Cavity length: longest board plus clearance at both ends
cavity_length = max(esp32_board_length, gps_module_length, imu_module_length) + 2.0 * component_clearance
# Cavity width: widest board plus clearance at both sides
cavity_width = max(esp32_board_width, gps_module_width, imu_module_width) + 2.0 * component_clearance
# Cavity height: tallest component plus the space above it
cavity_height = tallest_component_height + top_clearance
# Outer length of the base part
outer_length = cavity_length + 2.0 * wall_thickness
# Outer width of the base part
outer_width = cavity_width + 2.0 * wall_thickness
# Height of the base part from its underside to the rim the lid sits on
base_height = floor_thickness + cavity_height
# Radius of the four vertical outer corners (printing-friendly, also removes sharp edges near a seat)
outer_corner_radius = 3.0

# =====================================================================================
# LID
# =====================================================================================

# Lid plate length (same footprint as the base)
lid_length = outer_length
# Lid plate width (same footprint as the base)
lid_width = outer_width
# Lid plate thickness
lid_thickness = 2.0
# Height of the lip that drops into the cavity to locate the lid
lid_lip_height = 2.5
# Wall thickness of the lip frame
lid_lip_thickness = 2.0
# Sliding clearance between the lip and the cavity wall
lid_clearance = 0.3

# =====================================================================================
# FASTENERS
# =====================================================================================

# Nominal lid screw size (M3)
lid_screw_diameter = 3.0
# Clearance hole in the lid for an M3 screw
lid_screw_clearance = 3.4
# Pilot hole in each corner boss for the M3 screw to self-tap into PLA
boss_pilot_diameter = 2.5
# Depth of the pilot hole measured down from the rim
boss_pilot_depth = 10.0

# =====================================================================================
# MOUNTING FLANGES (screw ears)
# =====================================================================================

# How far each flange sticks out beyond the end wall
flange_protrusion = 8.0
# Width of each flange across the end wall
flange_width = 18.0
# Thickness of each flange
flange_thickness = 2.0
# Hole diameter in each flange for the vehicle fixing screw
flange_hole_diameter = 4.5

# =====================================================================================
# OPENINGS
# =====================================================================================

# Width of the USB cutout along the end wall
usb_cutout_width = 12.0
# Height of the USB cutout
usb_cutout_height = 6.0
# Height of the USB cutout centre above the underside — set to match the real USB port height
usb_cutout_centre_height = 11.0
# Diameter of the reset-button access hole in the lid
reset_hole_diameter = 4.0
# X position of the reset hole from the lid centre
reset_hole_x = 24.0
# Y position of the reset hole from the lid centre
reset_hole_y = 0.0
# Diameter of the status-LED opening in the lid
led_window_diameter = 5.0
# X position of the LED opening from the lid centre
led_window_x = -24.0
# Y position of the LED opening from the lid centre
led_window_y = 0.0

# =====================================================================================
# UNIQUE-CODE LABEL RECESS
# =====================================================================================

# Length of the shallow recess on the lid top that carries the printed unique code
label_recess_length = 34.0
# Width of the shallow recess
label_recess_width = 18.0
# Depth of the recess (printed label sits flush or just below the lid surface)
label_recess_depth = 0.6
# X position of the recess from the lid centre
label_recess_x = 0.0
# Y position of the recess from the lid centre
label_recess_y = 0.0

# =====================================================================================
# OUTPUT
# =====================================================================================

# File name of the exported STEP model
step_filename = "ashvin_enclosure.step"
# File name of the exported STL mesh
stl_filename = "ashvin_enclosure.stl"
# Mesh chord tolerance for the STL in mm (smaller = finer)
stl_tolerance = 0.05
# Mesh angular tolerance for the STL in radians
stl_angular_tolerance = 0.3


# =====================================================================================
# BUILD
# =====================================================================================

def build_base() -> cq.Workplane:
    """Open-top tray: floor, walls, four corner bosses, two screw flanges, and the cutouts."""

    base = (
        cq.Workplane("XY")
        .box(outer_length, outer_width, base_height, centered=(True, True, False))
        .edges("|Z")
        .fillet(outer_corner_radius)
    )

    # Hollow out the cavity, cutting past the rim so the top is fully open.
    cavity = (
        cq.Workplane("XY")
        .workplane(offset=floor_thickness)
        .rect(cavity_length, cavity_width)
        .extrude(cavity_height + 1.0)
    )
    base = base.cut(cavity)

    # Four corner bosses, each tangent to the two internal walls and overlapping them slightly.
    boss_inset_x = cavity_length / 2.0 - boss_diameter / 2.0 + boss_wall_overlap
    boss_inset_y = cavity_width / 2.0 - boss_diameter / 2.0 + boss_wall_overlap
    boss_positions = [
        (boss_inset_x, boss_inset_y),
        (-boss_inset_x, boss_inset_y),
        (-boss_inset_x, -boss_inset_y),
        (boss_inset_x, -boss_inset_y),
    ]
    bosses = (
        cq.Workplane("XY")
        .workplane(offset=floor_thickness)
        .pushPoints(boss_positions)
        .circle(boss_diameter / 2.0)
        .extrude(cavity_height)
    )
    base = base.union(bosses)

    # Two screw flanges, one centred on each end wall, blended 1 mm into the wall.
    ear_embed = 1.0
    for sign in (1, -1):
        ear = (
            cq.Workplane("XY")
            .box(
                flange_protrusion + ear_embed,
                flange_width,
                flange_thickness,
                centered=(True, True, False),
            )
            .translate(
                (sign * (outer_length / 2.0 + (flange_protrusion - ear_embed) / 2.0), 0.0, 0.0)
            )
        )
        base = base.union(ear)

    # Pilot holes down the centre of each boss for the M3 lid screws.
    pilots = (
        cq.Workplane("XY")
        .workplane(offset=base_height - boss_pilot_depth)
        .pushPoints(boss_positions)
        .circle(boss_pilot_diameter / 2.0)
        .extrude(boss_pilot_depth + 1.0)
    )
    base = base.cut(pilots)

    # Fixing holes through the flanges.
    flange_holes = []
    for sign in (1, -1):
        flange_holes.append(
            cq.Workplane("XY")
            .workplane(offset=-1.0)
            .center(sign * (outer_length / 2.0 + flange_protrusion / 2.0), 0.0)
            .circle(flange_hole_diameter / 2.0)
            .extrude(flange_thickness + 2.0)
        )
    for hole in flange_holes:
        base = base.cut(hole)

    # USB cutout through the +X end wall.
    usb_cutout = (
        cq.Workplane("XY")
        .box(3.0 * wall_thickness, usb_cutout_width, usb_cutout_height, centered=(True, True, True))
        .translate((outer_length / 2.0, 0.0, usb_cutout_centre_height))
    )
    base = base.cut(usb_cutout)

    return base


def build_lid() -> cq.Workplane:
    """Lid plate with a locating lip, four screw clearance holes, LED and reset openings, label recess.

    Built in its own frame: the underside of the plate is at z = 0.
    """

    lid = (
        cq.Workplane("XY")
        .box(lid_length, lid_width, lid_thickness, centered=(True, True, False))
        .edges("|Z")
        .fillet(outer_corner_radius)
    )

    # Lip frame hanging below the plate, sized to drop into the cavity with sliding clearance.
    lip_length = cavity_length - 2.0 * lid_clearance
    lip_width = cavity_width - 2.0 * lid_clearance
    lip = (
        cq.Workplane("XY")
        .workplane(offset=-lid_lip_height)
        .rect(lip_length, lip_width)
        .rect(lip_length - 2.0 * lid_lip_thickness, lip_width - 2.0 * lid_lip_thickness)
        .extrude(lid_lip_height)
    )
    lid = lid.union(lip)

    # Screw clearance holes on the same centres as the base bosses.
    boss_inset_x = cavity_length / 2.0 - boss_diameter / 2.0 + boss_wall_overlap
    boss_inset_y = cavity_width / 2.0 - boss_diameter / 2.0 + boss_wall_overlap
    screw_positions = [
        (boss_inset_x, boss_inset_y),
        (-boss_inset_x, boss_inset_y),
        (-boss_inset_x, -boss_inset_y),
        (boss_inset_x, -boss_inset_y),
    ]
    screw_holes = (
        cq.Workplane("XY")
        .workplane(offset=-lid_lip_height - 1.0)
        .pushPoints(screw_positions)
        .circle(lid_screw_clearance / 2.0)
        .extrude(lid_thickness + lid_lip_height + 2.0)
    )
    lid = lid.cut(screw_holes)

    # Reset-button access hole.
    reset_hole = (
        cq.Workplane("XY")
        .workplane(offset=-1.0)
        .center(reset_hole_x, reset_hole_y)
        .circle(reset_hole_diameter / 2.0)
        .extrude(lid_thickness + 2.0)
    )
    lid = lid.cut(reset_hole)

    # Status-LED opening.
    led_window = (
        cq.Workplane("XY")
        .workplane(offset=-1.0)
        .center(led_window_x, led_window_y)
        .circle(led_window_diameter / 2.0)
        .extrude(lid_thickness + 2.0)
    )
    lid = lid.cut(led_window)

    # Shallow recess on the top face for the printed unique code.
    lid = (
        lid.faces(">Z")
        .workplane()
        .center(label_recess_x, label_recess_y)
        .rect(label_recess_length, label_recess_width)
        .cutBlind(-label_recess_depth)
    )

    return lid


def build_assembly() -> cq.Assembly:
    """Base with the lid seated on top of it."""
    base = build_base()
    lid = build_lid()

    assembly = cq.Assembly()
    assembly.add(base, name="ashvin_base", color=cq.Color(0.82, 0.83, 0.85))
    assembly.add(lid.translate((0.0, 0.0, base_height)), name="ashvin_lid", color=cq.Color(0.70, 0.74, 0.79))
    return assembly


def main() -> None:
    out_dir = os.path.dirname(os.path.abspath(__file__))
    step_path = os.path.join(out_dir, step_filename)
    stl_path = os.path.join(out_dir, stl_filename)

    assembly = build_assembly()
    compound = assembly.toCompound()

    exporters.export(compound, step_path)
    exporters.export(
        compound,
        stl_path,
        tolerance=stl_tolerance,
        angularTolerance=stl_angular_tolerance,
    )

    box = compound.BoundingBox()
    print("Ashvin enclosure — parametric model")
    print(f"  outer footprint : {outer_length:.1f} x {outer_width:.1f} mm")
    print(f"  total height    : {base_height + lid_thickness:.1f} mm (base {base_height:.1f} + lid {lid_thickness:.1f})")
    print(f"  cavity          : {cavity_length:.1f} x {cavity_width:.1f} x {cavity_height:.1f} mm")
    print(f"  bounding box    : {box.xlen:.1f} x {box.ylen:.1f} x {box.zlen:.1f} mm")
    print(f"  solids          : {len(compound.Solids())}")
    print(f"  volume          : {compound.Volume():.1f} mm^3")
    print(f"  STEP            : {step_path}")
    print(f"  STL             : {stl_path}")


if __name__ == "__main__":
    main()
