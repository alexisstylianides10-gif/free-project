# Drive a LEGO SPIKE Prime robot with a PS5 DualSense controller.
#
# This half runs on the hub under Pybricks firmware (v3.3 or newer). The hub
# can't pair with a DualSense directly, so ps5_bridge.py runs on a computer,
# reads the controller there and streams its state to this program over
# Bluetooth.
#
# See README.md for setup and the full control map.

from pybricks.hubs import PrimeHub
from pybricks.parameters import Color, Direction, Port
from pybricks.pupdevices import Motor
from pybricks.tools import StopWatch, wait
from uselect import poll
from ustruct import unpack
from usys import stdin

# ---------------------------------------------------------------------------
# Configuration: change these to match your robot.
# ---------------------------------------------------------------------------

LEFT_PORT = Port.A
RIGHT_PORT = Port.B

# Optional attachment motors (arm, claw, lift...). Set to None if unused.
ATTACHMENT_1_PORT = Port.C  # Triggers: R2 = forward, L2 = reverse
ATTACHMENT_2_PORT = Port.D  # Bumpers: R1 = forward, L1 = reverse

# Most two-wheel SPIKE bases mount the left motor mirrored. If the robot
# spins when you push straight forward, swap these two directions.
LEFT_DIRECTION = Direction.COUNTERCLOCKWISE
RIGHT_DIRECTION = Direction.CLOCKWISE

# Stick values below this (in %) are treated as zero, so a stick resting
# slightly off-centre doesn't make the robot creep.
DEADZONE = 8

# Power limits, in % of full motor power.
NORMAL_SPEED = 100
SLOW_SPEED = 40
TURN_SCALE = 70  # Arcade turning is softened so steering isn't twitchy.
ATTACHMENT_2_POWER = 60

# If no update arrives from the computer for this long, brake everything.
WATCHDOG_MS = 500

LOOP_MS = 10

# ---------------------------------------------------------------------------

# Packet format, must match ps5_bridge.py:
#   0xA5, lx, ly, rx, ry (int8, -100..100, y up is positive),
#   l2, r2 (uint8, 0..100), buttons (uint16, little endian),
#   dpad (uint8, 0 = none, 1 = up, then clockwise to 8 = up-left),
#   checksum (sum of the 9 payload bytes, & 0xFF)
HEADER = 0xA5
PAYLOAD_SIZE = 9

CROSS = 1 << 0
CIRCLE = 1 << 1
SQUARE = 1 << 2
TRIANGLE = 1 << 3
L1 = 1 << 4
R1 = 1 << 5
CREATE = 1 << 6
OPTIONS = 1 << 7
PS = 1 << 8
L3 = 1 << 9
R3 = 1 << 10

ARCADE = "A"
TANK = "T"


def deadzone(value):
    if abs(value) < DEADZONE:
        return 0
    # Rescale so output still starts near 0 just past the deadzone.
    sign = 1 if value > 0 else -1
    return sign * (abs(value) - DEADZONE) * 100 / (100 - DEADZONE)


def clamp(value, limit=100):
    return max(-limit, min(limit, value))


def arcade_mix(throttle, turn):
    left = throttle + turn
    right = throttle - turn
    # Scale both down together so turning at full throttle keeps its shape
    # instead of clipping one side.
    biggest = max(abs(left), abs(right), 100)
    return left * 100 / biggest, right * 100 / biggest


def optional_motor(port):
    if port is None:
        return None
    try:
        return Motor(port)
    except OSError:
        # Nothing plugged in there: run without it.
        return None


def show_mode(hub, mode, slow):
    hub.display.char(mode)
    hub.light.on(Color.ORANGE if slow else Color.GREEN)


def stop_all(motors):
    for motor in motors:
        if motor is not None:
            motor.brake()


def rumble(count):
    # The bridge watches for this line and rumbles the controller.
    print("rumble", count)


def read_latest_packet(source):
    """Return the newest complete packet waiting on stdin, or None.

    Draining everything each loop means a slow loop never falls behind and
    drives on stale stick positions.
    """
    latest = None
    while source.poll(0):
        if stdin.buffer.read(1)[0] != HEADER:
            continue  # Out of sync: skip until the next header byte.
        payload = stdin.buffer.read(PAYLOAD_SIZE + 1)
        if sum(payload[:PAYLOAD_SIZE]) & 0xFF != payload[PAYLOAD_SIZE]:
            continue
        latest = unpack("<bbbbBBHB", payload[:PAYLOAD_SIZE])
    return latest


hub = PrimeHub()
left_motor = Motor(LEFT_PORT, LEFT_DIRECTION)
right_motor = Motor(RIGHT_PORT, RIGHT_DIRECTION)
attachment_1 = optional_motor(ATTACHMENT_1_PORT)
attachment_2 = optional_motor(ATTACHMENT_2_PORT)
all_motors = (left_motor, right_motor, attachment_1, attachment_2)

source = poll()
source.register(stdin)

mode = ARCADE
slow = False
previous_buttons = 0
estop = False
connected = False
since_packet = StopWatch()

# Blue blink while waiting for the bridge to start sending.
hub.light.blink(Color.BLUE, [200, 200])
hub.display.char("?")
# Tells the bridge the program is running and ready for packets.
print("ready")

try:
    while True:
        packet = read_latest_packet(source)

        if packet is None:
            if connected and since_packet.time() > WATCHDOG_MS:
                # Bridge stopped, controller died or Bluetooth dropped.
                stop_all(all_motors)
                hub.light.blink(Color.BLUE, [200, 200])
                hub.display.char("?")
                connected = False
            wait(LOOP_MS)
            continue

        since_packet.reset()
        if not connected:
            connected = True
            hub.speaker.beep(1000, 100)
            rumble(1)
            show_mode(hub, mode, slow)

        lx, ly, rx, ry, l2, r2, buttons, dpad = packet
        # Only react on the press itself, not every packet while it's held.
        just_pressed = buttons & ~previous_buttons
        previous_buttons = buttons

        if just_pressed & CROSS:
            mode = TANK if mode == ARCADE else ARCADE
            rumble(1 if mode == ARCADE else 2)
            show_mode(hub, mode, slow)

        if just_pressed & TRIANGLE:
            slow = not slow
            rumble(1)
            show_mode(hub, mode, slow)

        if just_pressed & SQUARE:
            hub.speaker.beep(880, 150)

        # Circle is an emergency stop: everything brakes until it's released.
        if buttons & CIRCLE:
            if not estop:
                stop_all(all_motors)
                hub.light.on(Color.RED)
                rumble(3)
                estop = True
            wait(LOOP_MS)
            continue
        if estop:
            estop = False
            show_mode(hub, mode, slow)

        limit = SLOW_SPEED if slow else NORMAL_SPEED

        if mode == ARCADE:
            throttle = deadzone(ly)
            turn = deadzone(lx) * TURN_SCALE / 100
            left, right = arcade_mix(throttle, turn)
        else:
            left = deadzone(ly)
            right = deadzone(ry)

        # D-pad gives precise, fixed-speed nudges and overrides the sticks.
        if dpad == 1:  # Up
            left, right = 30, 30
        elif dpad == 5:  # Down
            left, right = -30, -30
        elif dpad == 3:  # Right
            left, right = 25, -25
        elif dpad == 7:  # Left
            left, right = -25, 25

        left_motor.dc(clamp(left * limit / 100))
        right_motor.dc(clamp(right * limit / 100))

        if attachment_1 is not None:
            power = r2 - l2
            if abs(power) < DEADZONE:
                attachment_1.hold()
            else:
                attachment_1.dc(clamp(power))

        if attachment_2 is not None:
            if buttons & R1:
                attachment_2.dc(ATTACHMENT_2_POWER)
            elif buttons & L1:
                attachment_2.dc(-ATTACHMENT_2_POWER)
            else:
                attachment_2.hold()

        wait(LOOP_MS)
finally:
    # Program stopped for any reason: never leave motors running.
    stop_all(all_motors)
    hub.light.on(Color.RED)
