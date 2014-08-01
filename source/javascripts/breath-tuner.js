'use strict';

/**
 * Call when DOM is ready.
 *
 * Terms:
 *   * 1 breath: 1 exhalation AND 1 inhalation
 *   * 1 half-breath: 1 exhalation OR 1 inhalation
 *
 * @class
 */
function BreathTuner() {
  var $ = window.jQuery,

      /** ID used by setTimeout(). */
      running = null,

      /** Current breath's index. */
      breathIndex = -1,

      /** Currently exhaling? */
      exhaling = false,

      /** Timestamp when the current half-breath started. */
      halfBreathStart = null,

      /** Elapsed milliseconds since the current half-breath started. */
      halfBreathSplit = 0,

      /** Max milliseconds that can be rendered per half-breath. */
      maxMS = 35000,

      /** Time cursor: how many milliseconds of the current half-breath have
       *  been rendered. */
      tCursor = 0,

      /** Maximum breaths that can be rendered. Also used to set the width of
       *  the canvas. */
      maxBreaths = 100,

      /** Bar height. */
      barHeight = 5,

      /** Min milliseconds that can be rendered. */
      minMS = 1000 / barHeight,

      /** Bar width. */
      barWidth = barHeight * 4,

      /** Horizontal space between bars. */
      barHSpace = 2,

      /** Vertical space between bars. */
      barVSpace = 4,

      /** X-axis height. */
      xAxisHeight = 2,

      /** Canvas height. */
      canvasHeight = xAxisHeight +
                    (barHSpace + barHeight) * (maxMS / 1000) * 2 +
                    (barHSpace + barHeight) * 2, // graticule marks

      /** Canvas width. */
      canvasWidth = (barWidth + barVSpace) * maxBreaths - barVSpace,

      /** Coordinate of x-axis' top edge. */
      exhOrigin = canvasHeight / 2 - xAxisHeight / 2,

      /** Coordinate of x-axis' bottom edge. */
      inhOrigin = canvasHeight / 2 + xAxisHeight / 2,

      /** X-position of the current breath relative to the left canvas edge. */
      xCursor = 0,

      /** Bar & graticule colors. */
      colors = {
        red:    'hsl(  0, 80%, 50%)',
        orange: 'hsl( 30, 80%, 50%)',
        yellow: 'hsl( 60, 80%, 50%)',
        green:  'hsl(130, 80%, 50%)',
        cyan:   'hsl(185, 80%, 50%)',
        blue:   'hsl(210, 80%, 50%)',
        violet: 'hsl(265, 80%, 50%)',
        purple: 'hsl(315, 80%, 50%)'
      },

      /**
       * Statistics table:
       *
       * stats = [
       *   {
       *     exhTime,
       *     exhTimeSum,
       *     exhTimeAvg,
       *     exhTimeRatio,
       *
       *     inhTime,
       *     inhTimeSum,
       *     inhTimeAvg,
       *     inhTimeRatio,
       *
       *     breathTime,
       *     breathTimeSum,
       *     breathTimeAvg
       *   },
       *   ...
       * ]
       */
      stats = [],

      /** Canvas object. */
      canvas = $('#canvas'),

      /** Canvas object context. */
      canvasContext = canvas[0].getContext('2d'),

      /** Breath number display. */
      breathNoDisplay = $('#breathNo'),

      /** Exhalation timer display. */
      exhTimerDisplay = $('#exhTimer'),

      /** Inhalation timer display. */
      inhTimerDisplay = $('#inhTimer'),

      /** Statistics display. */
      statsDisplay = {
        exhSum:   $('#exhSum'),
        exhAvg:   $('#exhAvg'),
        exhRatio: $('#exhRatio'),

        inhSum:   $('#inhSum'),
        inhAvg:   $('#inhAvg'),
        inhRatio: $('#inhRatio'),

        breathSum: $('#breathSum'),
        breathAvg: $('#breathAvg')
      };

  // Default stats
  stats[-1] = {
    exhTime: 0,
    exhSum: 0,
    exhAvg: 0,
    exhRatio: 0,

    inhTime: 0,
    inhSum: 0,
    inhAvg: 0,
    inhRatio: 0,

    breathTime: 0,
    breathSum: 0,
    breathAvg: 0
  };

  canvas[0].width = canvasWidth;
  canvas[0].height = canvasHeight;

  $('#chart')
    .css('height', canvasHeight + 'px');

  $('#xAxis')
    .css('height', xAxisHeight + 'px')
    .css('margin-top', - xAxisHeight / 2 + 'px');

  $('#graticule')
    .css('width', barWidth + 'px')
    .css('height', canvasHeight - barHeight * 2 + 'px')
    .css('border-top', barHeight + 'px solid ' + colors.purple)
    .css('border-bottom', barHeight + 'px solid ' + colors.purple)
    .css('margin-left', - barWidth / 2 + 'px')

  // Reposition the canvas based on the bar width
  updateCanvasPosition();

  // Add button controls
  $('#switch').click( function () { switchBreath(); } );
  $('#stop').click(   function () { stop(); } );
  $('#back').click(   function () { back(); } );

  // Add keyboard controls
  $(document).keydown(function(e) {
    switch (e.which) {
      case 32: // SPACE
      case 13: // ENTER
        switchBreath();
        return false;
      case 27: // ESC
        stop();
        return false;
      case  8: // BACKSPACE
        back();
        return false;
    }
  });

  /* Functions
   * ------------------------------------------------------------------------ */

  /**
   * Updates the canvas' horizontal position so the current breath is aligned
   * with the graticule. Also updates xCursor.
   */
  function updateCanvasPosition() {
    xCursor = (barWidth + barVSpace) * breathIndex;
    canvas.css('margin-left', barWidth / 2 + barVSpace -
                              (barWidth + barVSpace) * (breathIndex + 1) +
                              'px');
  }

  /**
   * Draws the time spent breathing as bars on the canvas.
   */
  function renderTime() {
    // Get milliseconds since current half-breath started
    halfBreathSplit = new Date() - halfBreathStart;

    // Round to deciseconds, but stay in milli
    halfBreathSplit = Math.round(halfBreathSplit / 100) * 100;

    // Project tCursor's next position, so we don't render more than the elapsed
    // time
    var tCursorNext;

    while ((tCursorNext = tCursor + minMS) <= halfBreathSplit && tCursor < maxMS) {

      // Y-position relative to an imaginary x-axis
      var yCursor = tCursorNext / minMS + // bar pixels
                    Math.ceil(tCursorNext / 1000) * barHSpace; // space pixels

      // Y-position relative to the top canvas edge, but calculated in
      // relation to the rendered x-axis (which has height)
      if (exhaling)
        yCursor = exhOrigin - yCursor;
      else
        yCursor = inhOrigin + yCursor - 1;

      if        (tCursorNext <=  2000) {
        canvasContext.fillStyle = colors.red;
      } else if (tCursorNext <=  5000) {
        canvasContext.fillStyle = colors.orange;
      } else if (tCursorNext <= 10000) {
        canvasContext.fillStyle = colors.yellow;
      } else if (tCursorNext <= 15000) {
        canvasContext.fillStyle = colors.green;
      } else if (tCursorNext <= 20000) {
        canvasContext.fillStyle = colors.cyan;
      } else if (tCursorNext <= 25000) {
        canvasContext.fillStyle = colors.blue;
      } else if (tCursorNext <= 30000) {
        canvasContext.fillStyle = colors.violet;
      } else {
        canvasContext.fillStyle = colors.purple;
      }

      canvasContext.fillRect( xCursor,
                              yCursor,
                              barWidth,
                              1);

      tCursor = tCursorNext;
    }

    if (exhaling)
      updateExhTimerDisplay(halfBreathSplit);
    else
      updateInhTimerDisplay(halfBreathSplit);
  }

  /**
   * Runs the main loop.
   */
  function run() {
    renderTime();
    running = setTimeout(run, 100);
  }

  /**
   * Switches from exhaling to inhaling, and vice versa.
   */
  function switchBreath() {
    // Protect the user from double key press
    if (!halfBreathStart || new Date() - halfBreathStart > 2000) {
      stop();
      exhaling = !exhaling;
      tCursor = 0;
      start();
    }
  }

  /**
   * Starts the tuner.
   */
  function start() {
    if (!running) {
      if (exhaling) {
        breathIndex++;
        updateCanvasPosition();
        updateBreathNoDisplay();
      }
      halfBreathStart = new Date();
      run();
    }
  }

  /**
   * Stops the tuner.
   */
  function stop() {
    if (running) {
      clearTimeout(running);
      running = null;

      // Render remainder
      renderTime();

      pushStats();
      if (!exhaling) updateStatsDisplay();

      halfBreathStart = null;
    }
  }

  /**
  * Stops the tuner and deletes the last breath.
  */
  function back() {
    if (breathIndex > -1) {
      stop();

      // Delete the last exhalation
      var yCursor = 0;
      var width = barWidth;
      var height = (canvasHeight - xAxisHeight) / 2;
      canvasContext.clearRect(xCursor, yCursor, width, height);

      // Delete the last inhalation
      yCursor = (canvasHeight + xAxisHeight) / 2;
      canvasContext.clearRect(xCursor, yCursor, width, height);

      stats.pop();

      breathIndex--;
      exhaling = false;

      updateCanvasPosition();
      updateBreathNoDisplay();
      updateExhTimerDisplay();
      updateInhTimerDisplay();
      updateStatsDisplay();
    }
  }

  /**
   * Calculate and store statistics.
   */
  function pushStats() {
    if (exhaling) {
      // Init a stats row
      stats[breathIndex] = {};

      stats[breathIndex].exhTime = halfBreathSplit;

      if (breathIndex > 0) {
        stats[breathIndex].exhSum = stats[breathIndex - 1].exhSum +
                                    stats[breathIndex].exhTime;
      } else {
        stats[breathIndex].exhSum = stats[breathIndex].exhTime;
      }

      stats[breathIndex].exhAvg = stats[breathIndex].exhSum /
                                  (breathIndex + 1);

    // IF inhaling
    } else {
      stats[breathIndex].inhTime = halfBreathSplit;

      stats[breathIndex].breathTime = stats[breathIndex].exhTime +
                                      stats[breathIndex].inhTime;

      if (breathIndex > 0) {
        stats[breathIndex].inhSum = stats[breathIndex - 1].inhSum +
                                    stats[breathIndex].inhTime;

        stats[breathIndex].breathSum =  stats[breathIndex - 1].breathSum +
                                        stats[breathIndex].breathTime;

      } else {
        stats[breathIndex].inhSum = stats[breathIndex].inhTime;

        stats[breathIndex].breathSum = stats[breathIndex].breathTime;
      }

      stats[breathIndex].inhAvg = stats[breathIndex].inhSum /
                                  (breathIndex + 1);

      stats[breathIndex].breathAvg =  stats[breathIndex].breathSum /
                                      (breathIndex + 1);

      stats[breathIndex].exhRatio = 100 * stats[breathIndex].exhSum /
                                    stats[breathIndex].breathSum;

      stats[breathIndex].inhRatio = 100 * stats[breathIndex].inhSum /
                                    stats[breathIndex].breathSum;
    }
  }

  /**
   * Update the breath number display.
   */
  function updateBreathNoDisplay() {
    breathNoDisplay.html(breathIndex + 1);
  }

  /**
   * Update the exhalation timer.
   */
  function updateExhTimerDisplay(time) {
    if (time == undefined)
      time = stats[breathIndex].exhTime;
    exhTimerDisplay.html((time / 1000).toFixed(1));
  }

  /**
   * Update the inhalation timer.
   */
  function updateInhTimerDisplay(time) {
    if (time == undefined)
      time = stats[breathIndex].inhTime;
    inhTimerDisplay.html((time / 1000).toFixed(1));
  }

  /**
   * Updates the stats table.
   */
  function updateStatsDisplay() {
    function formatSeconds(i) {
      return (i / 1000).toFixed(1);
    }

    function formatMinutes(i) {
      var m = Math.floor(i / 60000);
      var s = i % 60000 / 1000;
      return m + ':' + ('0' + s.toFixed(1)).slice(-4);
    }

    function formatRatio(i) {
      return i.toFixed(1) + '%';
    }

    statsDisplay.exhSum.html(formatMinutes(stats[breathIndex].exhSum));
    statsDisplay.exhAvg.html(formatSeconds(stats[breathIndex].exhAvg));
    statsDisplay.exhRatio.html(formatRatio(stats[breathIndex].exhRatio));

    statsDisplay.inhSum.html(formatMinutes(stats[breathIndex].inhSum));
    statsDisplay.inhAvg.html(formatSeconds(stats[breathIndex].inhAvg));
    statsDisplay.inhRatio.html(formatRatio(stats[breathIndex].inhRatio));

    statsDisplay.breathSum.html(formatMinutes(stats[breathIndex].breathSum));
    statsDisplay.breathAvg.html(formatSeconds(stats[breathIndex].breathAvg));
  }
}

$(function () {
  BreathTuner();
});
