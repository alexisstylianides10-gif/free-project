# SPIKE Prime × Xbox Controller

Drive a LEGO SPIKE Prime robot with an Xbox wireless controller. The program
runs on the hub under [Pybricks](https://pybricks.com) firmware, and the
controller connects straight to the hub over Bluetooth. Once the program is
running, you don't need a phone or laptop.

This folder is separate from the web app in the rest of this repository.

## What you need

- LEGO SPIKE Prime hub (a Robot Inventor 51515 hub works too)
- An Xbox Wireless Controller with Bluetooth: the Series X|S controller, or an
  Xbox One controller model 1708 or newer. Update it to the latest firmware
  using the Xbox Accessories app on Windows or an Xbox console.
- Two drive motors, plus up to two optional attachment motors
- A computer with Chrome or Edge to install Pybricks

## Setup

1. **Install Pybricks firmware.** Go to <https://code.pybricks.com>, click the
   gear icon, then **Install Pybricks Firmware** and follow the steps. You need
   v3.3 or newer. You can reinstall the original LEGO firmware with the SPIKE
   app at any time.
2. **Load the program.** Open `xbox_drive.py` in Pybricks Code (or paste its
   contents into a new file).
3. **Check the ports** in the configuration block at the top of the file.
   The defaults are:

   | Port | Motor |
   |------|-------|
   | A | Left drive |
   | B | Right drive |
   | C | Attachment 1 (optional) |
   | D | Attachment 2 (optional) |

   If nothing is plugged into C or D, the program runs without them.
4. **Run it.** Connect to the hub in Pybricks Code and press ▶. The program is
   now saved on the hub too, so later you can start it with the hub's center
   button and leave the computer behind.

## Pairing the controller

1. Start the program. The hub light blinks **blue** and the display shows `?`.
2. Turn on the controller, then hold its small **pair** button (on the top,
   beside the USB port) until the Xbox logo flashes quickly.
3. When it connects, the hub beeps, the controller rumbles, and the light
   turns **green**.

The controller only pairs while the program is waiting for it. If the program
gives up first, run it again.

## Controls

| Input | Action |
|-------|--------|
| Left stick | Drive (arcade mode: up/down = speed, left/right = steer) |
| Left + right stick | Drive (tank mode: each stick drives one side) |
| **A** | Switch between arcade (`A` on display) and tank (`T`) |
| **Y** | Toggle slow mode for precise driving (light turns orange) |
| **B** (hold) | Emergency stop: all motors brake, light turns red |
| **X** | Horn |
| D-pad | Slow nudges forward, back and on the spot. Overrides the sticks |
| Right trigger / left trigger | Attachment 1 forward / reverse, proportional |
| RB / LB | Attachment 2 forward / reverse |

If the controller disconnects or the program stops, every motor brakes and
the light turns red.

## Tuning

All settings are constants at the top of `xbox_drive.py`:

- **`LEFT_DIRECTION` / `RIGHT_DIRECTION`**: if pushing straight forward makes
  the robot spin or drive backwards, flip these.
- **`DEADZONE`**: raise it if the robot creeps when the sticks are released.
- **`SLOW_SPEED`, `NORMAL_SPEED`**: top speed in each mode, as % power.
- **`TURN_SCALE`**: lower it for gentler steering in arcade mode.
- **`ATTACHMENT_2_POWER`**: how hard the bumpers drive attachment 2.

## Troubleshooting

- **`ImportError` for `XboxController`**: the firmware is older than v3.3.
  Reinstall Pybricks from code.pybricks.com.
- **The controller won't connect**: update its firmware, make sure it isn't
  already paired to a nearby console or PC (turn that device's Bluetooth off),
  and hold the pair button until the logo flashes quickly.
- **`OSError` on port A or B**: a drive motor isn't plugged into the port named
  in the configuration block.
- **Pybricks Code disconnects when the controller connects**: this is normal on
  some setups. The program keeps running on the hub.
