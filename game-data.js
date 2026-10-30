// Edit this file to set the opponent and scoreboard. No UI or build step is required.
// scoreMode: 'simulation' keeps the demo basketball score running.
// Use 'manual' when an external controller supplies the real score and game clock.
// liveFeed: true pulls the real OKC Thunder game from ESPN (thunder-feed.js) and overrides the values below.
// The values below are only used if liveFeed is false, or before the first ESPN result on a brand-new browser.
window.HONEY_MEADOWS_GAME = {
  liveFeed: true,
  // Headquarters Etsy dashboard. The sales sheet links are encrypted with the Headquarters
  // password, so they aren't readable in the public code. To change the password or the sheet, run:
  //   node tools/encrypt-sheet.cjs "<password>" "<sheetId>" "<csvUrl>"
  // and paste the result here.
  etsySecret: {"v":1,"iterations":600000,"salt":"EPkn9T/j9/O12i8F3cUpaQ==","iv":"JT3sglhL5UJgENXl","data":"cWf8XrKFaIUDBTQQgWRxNYSiu13k46hLO+xi3I3OaRXg8+cRGY4dJnY4GiD+m8eIaq1qBHxjwFMX7lbJzse2+pWHoAqAbXN0hy6flBJMrFZbvX5COYcBFhtftrQLJS+2QzA+rbYcC/D0huMBRuJXh52s0rfZpIr3e3cfs1yIg7SO/d/RKM+RRqfUdNvQjtqOLVIKt88/UqlEn3LL/W1hCi+O7Fe/GaJ9BMYVNdpIfBrCxyer/aOlGHNL2XsAhyKl0c/7wM5Opq4qyXFLeynUUzWkhZZjrsyg4HTf/LZdNnllGH6u3+Hg8uv5Y7lYFpdRIA=="},
  // Set to true to show the Completed / Not completed boxes (uses the shipped timestamp in column G).
  etsyShowOrderStatus: false,
  opponent: 'SAS',
  scoreMode: 'simulation',
  score: { home: 20, away: 16 },
  period: 'Q2',
  clock: '4:12'
};
