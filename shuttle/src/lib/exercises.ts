import type { IconName } from "../components/ui";

export interface CardioType {
  id: string;
  name: string;
  met: number;
  icon: IconName;
}

/** MET values from the Compendium of Physical Activities. */
export const CARDIO: CardioType[] = [
  { id: "walk", name: "Walking (3 mph)", met: 3.5, icon: "figure.walk" },
  { id: "walk-brisk", name: "Walking, brisk (4 mph)", met: 5, icon: "figure.walk" },
  { id: "run-5", name: "Running (5 mph)", met: 8.3, icon: "figure.run" },
  { id: "run-6", name: "Running (6 mph)", met: 9.8, icon: "figure.run" },
  { id: "run-7", name: "Running (7.5 mph)", met: 11.5, icon: "figure.run" },
  { id: "cycle", name: "Cycling, moderate", met: 7.5, icon: "figure.outdoor.cycle" },
  { id: "cycle-indoor", name: "Indoor cycling", met: 8.5, icon: "figure.indoor.cycle" },
  { id: "elliptical", name: "Elliptical", met: 5, icon: "figure.elliptical" },
  { id: "rowing", name: "Rowing machine", met: 7, icon: "figure.rower" },
  { id: "stairs", name: "Stair climber", met: 9, icon: "figure.stair.stepper" },
  { id: "swim", name: "Swimming laps", met: 7, icon: "figure.pool.swim" },
  { id: "hiit", name: "HIIT", met: 8, icon: "figure.highintensity.intervaltraining" },
  { id: "yoga", name: "Yoga", met: 2.5, icon: "figure.yoga" },
  { id: "basketball", name: "Basketball", met: 6.5, icon: "figure.basketball" },
  { id: "soccer", name: "Soccer", met: 7, icon: "figure.soccer" },
  { id: "hike", name: "Hiking", met: 6, icon: "figure.hiking" },
  { id: "jump-rope", name: "Jump rope", met: 11, icon: "figure.jumprope" },
  { id: "dance", name: "Dancing", met: 5, icon: "figure.dance" },
];

export const LIFTS = [
  "Bench Press",
  "Incline Dumbbell Press",
  "Overhead Press",
  "Squat",
  "Front Squat",
  "Deadlift",
  "Romanian Deadlift",
  "Leg Press",
  "Lunges",
  "Pull-ups",
  "Lat Pulldown",
  "Barbell Row",
  "Seated Cable Row",
  "Bicep Curl",
  "Hammer Curl",
  "Tricep Pushdown",
  "Skull Crushers",
  "Lateral Raise",
  "Face Pull",
  "Leg Curl",
  "Leg Extension",
  "Calf Raise",
  "Hip Thrust",
  "Dips",
  "Push-ups",
  "Plank (sec)",
];

/** Strength training ≈ 5 METs (vigorous). */
export const STRENGTH_MET = 5;
