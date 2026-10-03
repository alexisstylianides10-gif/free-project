# Drive a LEGO SPIKE Prime robot with an Xbox controller.
#
# Runs on the hub itself under Pybricks firmware (v3.3 or newer). The
# controller pairs straight to the hub over Bluetooth: no phone, laptop or
# app needs to stay connected once the program is started.
#
# See README.md for setup, pairing and the full control map.

from pybricks.hubs import PrimeHub
from pybricks.iodevices import XboxController
from pybricks.parameters import Button, Color, Direction, Port
from pybricks.pupdevices import Motor
from pybricks.tools import wait

# ---------------------------------------------------------------------------
# Configuration: change these to match your robot.
# ---------------------------------------------------------------------------

LEFT_PORT = Port.A
RIGHT_PORT = Port.B

# Optional attachment motors (arm, claw, lift...). Set to None if unused.
ATTACHMENT_1_PORT = Port.C  # Triggers: right = forward, left = reverse
ATTACHMENT_2_PORT = Port.D  # Bumpers: RB = forward, LB = reverse

# Most two-wheel SPIKE bases mount the left motor mirrored. If the robot
# spins when you push straight forward, swap these two directions.
LEFT_DIRECTION = Direction.COUNTERCLOCKWISE
RIGHT_DIRECTION = Direction.CLOCKWISE

# Stick values below this (in %) are treated as zero, so a worn stick
# resting slightly off-centre doesn't make the robot creep.
DEADZONE = 8

# Power limits, in % of full motor power.
NORMAL_SPEED = 100
SLOW_SPEED = 40
TURN_SCALE = 70  # Arcade turning is softened so steering isn't twitchy.
ATTACHMENT_2_POWER = 60

LOOP_MS = 10

# ---------------------------------------------------------------------------

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


hub = PrimeHub()
left_motor = Motor(LEFT_PORT, LEFT_DIRECTION)
right_motor = Motor(RIGHT_PORT, RIGHT_DIRECTION)
attachment_1 = optional_motor(ATTACHMENT_1_PORT)
attachment_2 = optional_motor(ATTACHMENT_2_PORT)
all_motors = (left_motor, right_motor, attachment_1, attachment_2)

# Blue blink while waiting: turn the controller on and hold its pair button.
hub.light.blink(Color.BLUE, [200, 200])
hub.display.char("?")
controller = XboxController()
hub.speaker.beep(1000, 100)
controller.rumble(power=50, duration=150, count=1)

mode = ARCADE
slow = False
previous = set()
estop = False
show_mode(hub, mode, slow)

try:
    while True:
        pressed = controller.buttons.pressed()
        # Only react on the press itself, not every loop while it's held.
        just_pressed = pressed - previous
        previous = pressed

        if Button.A in just_pressed:
            mode = TANK if mode == ARCADE else ARCADE
            controller.rumble(power=40, duration=80, count=1 if mode == ARCADE else 2)
            show_mode(hub, mode, slow)

        if Button.Y in just_pressed:
            slow = not slow
            controller.rumble(power=40, duration=80, count=1)
            show_mode(hub, mode, slow)

        if Button.X in just_pressed:
            hub.speaker.beep(880, 150)

        # B is an emergency stop: everything brakes until B is released.
        if Button.B in pressed:
            if not estop:
                stop_all(all_motors)
                hub.light.on(Color.RED)
                controller.rumble(power=100, duration=200, count=1)
                estop = True
            wait(LOOP_MS)
            continue
        if estop:
            estop = False
            show_mode(hub, mode, slow)

        limit = SLOW_SPEED if slow else NORMAL_SPEED

        if mode == ARCADE:
            lx, ly = controller.joystick_left()
            throttle = deadzone(ly)
            turn = deadzone(lx) * TURN_SCALE / 100
            left, right = arcade_mix(throttle, turn)
        else:
            _, ly = controller.joystick_left()
            _, ry = controller.joystick_right()
            left = deadzone(ly)
            right = deadzone(ry)

        # D-pad gives precise, fixed-speed nudges and overrides the sticks.
        dpad = controller.dpad()
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
            lt, rt = controller.triggers()
            power = rt - lt
            if abs(power) < DEADZONE:
                attachment_1.hold()
            else:
                attachment_1.dc(clamp(power))

        if attachment_2 is not None:
            if Button.RB in pressed:
                attachment_2.dc(ATTACHMENT_2_POWER)
            elif Button.LB in pressed:
                attachment_2.dc(-ATTACHMENT_2_POWER)
            else:
                attachment_2.hold()

        wait(LOOP_MS)
finally:
    # Controller disconnected, battery died, or the program was stopped:
    # never leave motors running.
    stop_all(all_motors)
    hub.light.on(Color.RED)
