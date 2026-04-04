"""Unit tests for Retina / multi-monitor coordinate mapping (no display required)."""

from display_mapping import monitor_logical_size, stream_coords_to_global


def test_monitor_logical_size_retina_scale_2():
    mon = {"left": 0, "top": 0, "width": 3024, "height": 1964}
    lw, lh = monitor_logical_size(mon, scale=2.0)
    assert lw == 1512
    assert lh == 982


def test_monitor_logical_size_scale_1_windows():
    mon = {"left": 0, "top": 0, "width": 1920, "height": 1080}
    lw, lh = monitor_logical_size(mon, scale=1.0)
    assert lw == 1920
    assert lh == 1080


def test_stream_coords_to_global_secondary_monitor():
    # Physical offset 1920px left at scale 2 -> logical offset 960
    mon = {"left": 1920, "top": 0, "width": 1920, "height": 1080}
    scale = 2.0
    gx, gy = stream_coords_to_global(100, 50, mon, scale)
    assert gx == 1920 // 2 + 100
    assert gy == 50


def test_stream_coords_to_global_primary():
    mon = {"left": 0, "top": 0, "width": 2560, "height": 1440}
    gx, gy = stream_coords_to_global(10, 20, mon, 1.0)
    assert (gx, gy) == (10, 20)
