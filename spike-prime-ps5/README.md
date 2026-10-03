# SPIKE Prime × PS5 Controller

Drive a LEGO SPIKE Prime robot with a PS5 DualSense controller.

A SPIKE Prime hub can't pair with a DualSense directly. Pybricks only supports
PlayStation controllers on the EV3. So this uses a computer as a bridge:

```
DualSense  ──Bluetooth──▶  computer (ps5_bridge.py)  ──Bluetooth LE──▶  hub (ps5_hub.py)
```

The computer has to stay on and in range while you drive. If you have an Xbox
controller, `../spike-prime-xbox` pairs straight to the hub with no computer.

## What you need

- LEGO SPIKE Prime hub (a Robot Inventor 51515 hub works too)
- PS5 DualSense controller (a DualSense Edge or PS4 DualShock 4 also work)
- A Windows, macOS or Linux computer with Bluetooth and Python 3.10+
- Two drive motors, plus up to two optional attachment motors

## Setup (once)

1. **Install Pybricks firmware.** Go to <https://code.pybricks.com> in Chrome
   or Edge, click the gear icon, then **Install Pybricks Firmware** and follow
   the steps. You can reinstall the LEGO firmware with the SPIKE app any time.
2. **Save the hub program.** Open `ps5_hub.py` in Pybricks Code, check the
   ports in the configuration block at the top, connect to the hub and press
   ▶ once. That saves it on the hub. Press ■ to stop it.

   | Port | Motor |
   |------|-------|
   | A | Left drive |
   | B | Right drive |
   | C | Attachment 1 (optional) |
   | D | Attachment 2 (optional) |

3. **Disconnect Pybricks Code** from the hub (Bluetooth button in the toolbar).
   The hub accepts only one computer connection at a time.
4. **Install the bridge's dependencies:**

   ```
   pip install -r requirements.txt
   ```

5. **Pair the DualSense with your computer.** Hold **Create** + **PS** until
   the light bar flashes, then pick "DualSense Wireless Controller" in your
   computer's Bluetooth settings. A USB-C cable works too.

## Driving

1. Turn the hub on.
2. Run the bridge:

   ```
   python ps5_bridge.py
   ```

   If you renamed the hub in Pybricks, add `--name yourhubname`.
3. The bridge finds the controller, connects to the hub and starts
   `ps5_hub.py` for you. The hub beeps, the controller rumbles and the hub
   light turns **green**. If the hub still shows `?`, press its center button.

To finish, press the **PS** button or Ctrl+C.

## Controls

| Input | Action |
|-------|--------|
| Left stick | Drive (arcade mode: up/down = speed, left/right = steer) |
| Left + right stick | Drive (tank mode: each stick drives one side) |
| **✕ Cross** | Switch between arcade (`A` on display) and tank (`T`) |
| **△ Triangle** | Toggle slow mode for precise driving (light turns orange) |
| **○ Circle** (hold) | Emergency stop: all motors brake, light turns red |
| **□ Square** | Horn |
| D-pad | Slow nudges forward, back and on the spot. Overrides the sticks |
| R2 / L2 | Attachment 1 forward / reverse, proportional to how far you press |
| R1 / L1 | Attachment 2 forward / reverse |
| **PS** | Quit the bridge |

**Safety:** if the hub hears nothing from the computer for half a second
(the bridge quit, the controller died, or Bluetooth dropped), it brakes every
motor and blinks blue until updates come back.

## Tuning

All settings are constants at the top of `ps5_hub.py`:

- **`LEFT_DIRECTION` / `RIGHT_DIRECTION`**: if pushing straight forward makes
  the robot spin or drive backwards, flip these.
- **`DEADZONE`**: raise it if the robot creeps when the sticks are released.
- **`SLOW_SPEED`, `NORMAL_SPEED`**: top speed in each mode, as % power.
- **`TURN_SCALE`**: lower it for gentler steering in arcade mode.
- **`ATTACHMENT_2_POWER`**: how hard R1/L1 drive attachment 2.
- **`WATCHDOG_MS`**: how long the hub waits for updates before braking.

## Troubleshooting

- **"Looking for a Pybricks hub" forever**: the hub is off, still connected to
  Pybricks Code, or not running Pybricks firmware. Close Pybricks Code tabs.
- **"Waiting for a controller" forever**: the DualSense isn't paired with this
  computer, or it went to sleep. Press PS to wake it.
- **Controls feel laggy**: move the computer closer to the hub. Bluetooth from
  the controller and to the hub share the same radio, so a USB cable for the
  controller can help.
- **Linux: permission errors from Bluetooth**: make sure your user is in the
  `bluetooth` group and BlueZ is running.
- **`OSError` on port A or B**: a drive motor isn't plugged into the port named
  in the configuration block.

## How it works

The bridge sends an 11-byte packet about 30 times a second through the
Pybricks "write stdin" Bluetooth command: a header byte, both sticks, both
triggers, a button bitmask, the D-pad and a checksum. The format is documented
at the top of `ps5_hub.py`. The hub prints `ready` when it starts and
`rumble N` when it wants the controller to buzz, and the bridge listens for
those.
