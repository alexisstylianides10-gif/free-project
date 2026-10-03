"""Bridge a PS5 DualSense controller to a SPIKE Prime hub running Pybricks.

The DualSense pairs with this computer. This script reads it and streams
its state to ps5_hub.py on the hub over Bluetooth Low Energy, about 30
times a second.

Usage:
    python ps5_bridge.py              # connect to the first Pybricks hub found
    python ps5_bridge.py --name robot # connect to the hub with this name

See README.md for setup.
"""

import argparse
import asyncio
import os
import struct
import sys

os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
# Keep reading the controller when the terminal isn't the focused window.
os.environ.setdefault("SDL_JOYSTICK_ALLOW_BACKGROUND_EVENTS", "1")

import pygame
from bleak import BleakClient, BleakScanner
from bleak.exc import BleakError
from pygame._sdl2 import controller as sdl_controller

PYBRICKS_SERVICE_UUID = "c5f50001-8280-46da-89f4-6d8051e4aeef"
PYBRICKS_COMMAND_EVENT_UUID = "c5f50002-8280-46da-89f4-6d8051e4aeef"

# Pybricks protocol bytes.
COMMAND_START_USER_PROGRAM = 0x01
COMMAND_WRITE_STDIN = 0x06
EVENT_WRITE_STDOUT = 0x01

SEND_INTERVAL = 1 / 30

# Must match ps5_hub.py.
HEADER = 0xA5
BUTTON_BITS = [
    (pygame.CONTROLLER_BUTTON_A, 1 << 0),  # Cross
    (pygame.CONTROLLER_BUTTON_B, 1 << 1),  # Circle
    (pygame.CONTROLLER_BUTTON_X, 1 << 2),  # Square
    (pygame.CONTROLLER_BUTTON_Y, 1 << 3),  # Triangle
    (pygame.CONTROLLER_BUTTON_LEFTSHOULDER, 1 << 4),  # L1
    (pygame.CONTROLLER_BUTTON_RIGHTSHOULDER, 1 << 5),  # R1
    (pygame.CONTROLLER_BUTTON_BACK, 1 << 6),  # Create
    (pygame.CONTROLLER_BUTTON_START, 1 << 7),  # Options
    (pygame.CONTROLLER_BUTTON_GUIDE, 1 << 8),  # PS
    (pygame.CONTROLLER_BUTTON_LEFTSTICK, 1 << 9),  # L3
    (pygame.CONTROLLER_BUTTON_RIGHTSTICK, 1 << 10),  # R3
]
PS_BUTTON = 1 << 8

# (up, right, down, left) -> 0 = none, 1 = up, then clockwise to 8 = up-left.
DPAD_CODES = {
    (0, 0, 0, 0): 0,
    (1, 0, 0, 0): 1,
    (1, 1, 0, 0): 2,
    (0, 1, 0, 0): 3,
    (0, 1, 1, 0): 4,
    (0, 0, 1, 0): 5,
    (0, 0, 1, 1): 6,
    (0, 0, 0, 1): 7,
    (1, 0, 0, 1): 8,
}


def stick(raw):
    """SDL axis (-32768..32767) to -100..100."""
    return max(-100, min(100, round(raw * 100 / 32767)))


def trigger(raw):
    """SDL trigger (0..32767) to 0..100."""
    return max(0, min(100, round(raw * 100 / 32767)))


def read_state(pad):
    axis = pad.get_axis
    lx = stick(axis(pygame.CONTROLLER_AXIS_LEFTX))
    # SDL reports up as negative; the hub expects up as positive.
    ly = -stick(axis(pygame.CONTROLLER_AXIS_LEFTY))
    rx = stick(axis(pygame.CONTROLLER_AXIS_RIGHTX))
    ry = -stick(axis(pygame.CONTROLLER_AXIS_RIGHTY))
    l2 = trigger(axis(pygame.CONTROLLER_AXIS_TRIGGERLEFT))
    r2 = trigger(axis(pygame.CONTROLLER_AXIS_TRIGGERRIGHT))

    buttons = 0
    for sdl_button, bit in BUTTON_BITS:
        if pad.get_button(sdl_button):
            buttons |= bit

    dpad_key = tuple(
        int(bool(pad.get_button(b)))
        for b in (
            pygame.CONTROLLER_BUTTON_DPAD_UP,
            pygame.CONTROLLER_BUTTON_DPAD_RIGHT,
            pygame.CONTROLLER_BUTTON_DPAD_DOWN,
            pygame.CONTROLLER_BUTTON_DPAD_LEFT,
        )
    )
    # Impossible combinations (e.g. a worn pad reporting up+down) count as none.
    dpad = DPAD_CODES.get(dpad_key, 0)

    return lx, ly, rx, ry, l2, r2, buttons, dpad


def encode(state):
    payload = struct.pack("<bbbbBBHB", *state)
    return bytes([HEADER]) + payload + bytes([sum(payload) & 0xFF])


def open_controller():
    pygame.init()
    sdl_controller.init()
    print("Waiting for a controller... (pair the DualSense with this computer)")
    while True:
        pygame.event.pump()
        for index in range(sdl_controller.get_count()):
            if sdl_controller.is_controller(index):
                pad = sdl_controller.Controller(index)
                print(f"Controller: {pad.name}")
                return pad
        pygame.time.wait(500)


async def find_hub(name):
    def matches(device, adv):
        if name is not None:
            return (device.name or adv.local_name or "").lower() == name.lower()
        return PYBRICKS_SERVICE_UUID in [u.lower() for u in adv.service_uuids]

    label = f"'{name}'" if name else "a Pybricks hub"
    print(f"Looking for {label}... (turn the hub on, and disconnect Pybricks Code)")
    while True:
        device = await BleakScanner.find_device_by_filter(matches, timeout=10)
        if device is not None:
            return device
        print("  not found yet, still looking...")


async def run(args):
    pad = open_controller()
    device = await find_hub(args.name)

    ready = asyncio.Event()
    disconnected = asyncio.Event()
    stdout_buffer = bytearray()

    def on_notify(_, data):
        if not data or data[0] != EVENT_WRITE_STDOUT:
            return
        stdout_buffer.extend(data[1:])
        while b"\n" in stdout_buffer:
            line, _, rest = bytes(stdout_buffer).partition(b"\n")
            stdout_buffer[:] = rest
            text = line.decode(errors="replace").strip()
            if text == "ready":
                ready.set()
            elif text.startswith("rumble"):
                count = int(text.split()[1]) if " " in text else 1
                asyncio.get_running_loop().create_task(do_rumble(pad, count))
            elif text:
                print(f"hub: {text}")

    def on_disconnect(_):
        disconnected.set()

    async with BleakClient(device, disconnected_callback=on_disconnect) as client:
        print(f"Connected to {device.name}.")
        await client.start_notify(PYBRICKS_COMMAND_EVENT_UUID, on_notify)

        try:
            # Start the program saved on the hub, so nobody has to press the
            # hub's button. Fails harmlessly if it's already running.
            await client.write_gatt_char(
                PYBRICKS_COMMAND_EVENT_UUID,
                bytes([COMMAND_START_USER_PROGRAM]),
                response=True,
            )
        except BleakError:
            print("  Couldn't start it remotely (it may already be running).")

        print("Waiting for ps5_hub.py to start on the hub...")
        try:
            await asyncio.wait_for(ready.wait(), timeout=5)
        except asyncio.TimeoutError:
            # Either it was already running (so we missed its hello) or it
            # hasn't been started. Streaming anyway covers both: the hub picks
            # up packets as soon as the program runs.
            print("  No reply yet. If the hub shows '?', press its center button.")
        print("Streaming controller. Press the PS button or Ctrl+C to quit.")

        while not disconnected.is_set():
            pygame.event.pump()
            if not pad.attached():
                print("Controller disconnected. The hub will brake.")
                break

            state = read_state(pad)
            if state[6] & PS_BUTTON:
                print("PS button pressed, quitting.")
                break

            await client.write_gatt_char(
                PYBRICKS_COMMAND_EVENT_UUID,
                bytes([COMMAND_WRITE_STDIN]) + encode(state),
                response=True,
            )
            await asyncio.sleep(SEND_INTERVAL)

        if disconnected.is_set():
            print("Hub disconnected.")


async def do_rumble(pad, count):
    for _ in range(count):
        try:
            pad.rumble(0.6, 0.6, 80)
        except pygame.error:
            return  # Rumble isn't supported on every OS / driver.
        await asyncio.sleep(0.16)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--name", help="hub name, if you renamed it in Pybricks")
    args = parser.parse_args()
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        print("\nStopped. The hub will brake within half a second.")
    finally:
        pygame.quit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
