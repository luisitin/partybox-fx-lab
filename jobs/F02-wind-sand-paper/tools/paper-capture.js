// Recording setup only: advance the fixed simulation to the shredding phase.
// The separate idle frame measurement does not execute this script.
// Recorded playback resumes in real time; this advance is not FPS evidence.
() => {
  const a = window.__sand;
  a.material('paper', 'shred');
  a.fire('truth');
  a.step(2.7);
  a.resume();
}
