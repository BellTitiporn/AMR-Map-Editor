# AMR Map Editor v0.10.9 — RMF Coordinate / Scale Fix

## Problem

Previous `.building.yaml` export used:

```yaml
coordinate_system: cartesian_meters
drawing:
  filename: map.png
```

while navigation/building vertices were exported in meters.

The PNG drawing itself is pixel-based and carried no explicit image transform/resolution in that
structure. Traffic Editor could therefore display the background at image scale while geometry was
at meter scale, resulting in severe scale and coordinate mismatch.

## Fix

RMF Building export now uses:

```yaml
coordinate_system: reference_image
```

All AMR Map Editor world coordinates are converted back into the original occupancy-image pixel
frame using:

- ROS map resolution
- ROS map origin X/Y
- ROS map origin yaw
- image height / Y-axis inversion

For origin yaw = 0:

```text
pixel_x = (world_x - origin_x) / resolution
pixel_y = image_height - (world_y - origin_y) / resolution
```

A full-width measurement is exported automatically:

```text
distance = image_width * resolution
```

This lets Traffic Editor recover the exact meters-per-pixel scale.

## Important

Export the matching Occupancy PNG with the same base filename and keep it beside the
`.building.yaml` file before opening the building map in Traffic Editor.

Example:

```text
factory.building.yaml
factory.png
```
