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

      /** Time when current half-breath started. */
      halfBreathStartTime = null,

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
      exhalationOrigin = canvasHeight / 2 - xAxisHeight / 2,

      /** Coordinate of x-axis' bottom edge. */
      inhalationOrigin = canvasHeight / 2 + xAxisHeight / 2,

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

      /** Breath times used to calculate statistics. */
      times = [],

      /** Canvas object. */
      canvas = $('#canvas'),

      /** Canvas object context. */
      canvasContext = canvas[0].getContext('2d'),

      /** Breath number display. */
      breathNoDisplay = $('#breathNo'),

      /** Exhalation timer display. */
      exhalationTimerDisplay = $('#exhalationTimer'),

      /** Inhalation timer display. */
      inhalationTimerDisplay = $('#inhalationTimer'),

      /** Stats table. */
      stats = {
        exhalationSum:   $('#exhalationSum'),
        exhalationAvg:   $('#exhalationAvg'),
        exhalationRatio: $('#exhalationRatio'),

        inhalationSum:   $('#inhalationSum'),
        inhalationAvg:   $('#inhalationAvg'),
        inhalationRatio: $('#inhalationRatio'),

        breathSum: $('#breathSum'),
        breathAvg: $('#breathAvg')
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
    var elapsed = new Date() - halfBreathStartTime;

    // Round to deciseconds, but stay in milli
    elapsed = Math.round(elapsed / 100) * 100;

    // Project tCursor's next position, so we don't render more than the elapsed
    // time
    var tCursorNext;

    while ((tCursorNext = tCursor + minMS) <= elapsed && tCursor < maxMS) {

      // Y-position relative to an imaginary x-axis
      var yCursor = tCursorNext / minMS + // bar pixels
                    Math.ceil(tCursorNext / 1000) * barHSpace; // space pixels

      // Y-position relative to the top canvas edge, but calculated in
      // relation to the rendered x-axis (which has height)
      if (exhaling)
        yCursor = exhalationOrigin - yCursor;
      else
        yCursor = inhalationOrigin + yCursor - 1;

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
      exhalationTimerDisplay.html((elapsed / 1000).toFixed(1));
    else
      inhalationTimerDisplay.html((elapsed / 1000).toFixed(1));

    return elapsed;
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
    if (!halfBreathStartTime || new Date() - halfBreathStartTime > 2000) {
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
        breathNoDisplay.html(breathIndex + 1);
      }
      halfBreathStartTime = new Date();
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
      var halfBreathTime = renderTime();

      if (exhaling) {
        times[breathIndex] = [halfBreathTime, null];
      } else {
        times[breathIndex][1] = halfBreathTime;
        updateStats();
      }

      halfBreathStartTime = null;
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

      breathIndex--;
      updateCanvasPosition();
      exhaling = false;

      // Reset counters
      breathNoDisplay.html(breathIndex + 1);
      exhalationTimerDisplay.html('0.0');
      inhalationTimerDisplay.html('0.0');
    }
  }

  /**
   * Toggles the tuner.
   */
  function toggle() {
    running ? stop() : start();
  }

  /**
   * Updates the stats table.
   */
  function updateStats() {
    function formatSeconds(i) {
      return (i / 1000).toFixed(1);
    }

    function formatMinutes(i) {
      var m = Math.floor(i / 60000);
      var s = i % 60000 / 1000;
      return m + ':' + ('0' + s.toFixed(1)).slice(-4);
    }

    function formatRatio(i) {
      return i.toFixed(1) + '%'
    }

    var exhalationSum = 0,
        inhalationSum = 0,
        breathSum = 0,
        timesLen = times.length;

    for (var i = 0; i < timesLen; i++) {
      exhalationSum += times[i][0];
      inhalationSum += times[i][1];
    }

    breathSum = exhalationSum + inhalationSum;

    stats.exhalationSum.html(formatMinutes(exhalationSum));
    stats.exhalationAvg.html(formatSeconds(exhalationSum/timesLen));
    stats.exhalationRatio.html(formatRatio(100*exhalationSum/breathSum));

    stats.inhalationSum.html(formatMinutes(inhalationSum));
    stats.inhalationAvg.html(formatSeconds(inhalationSum/timesLen));
    stats.inhalationRatio.html(formatRatio(100*inhalationSum/breathSum));

    stats.breathSum.html(formatMinutes(breathSum));
    stats.breathAvg.html(formatSeconds(breathSum/timesLen));
  }
}

$(function () {
  BreathTuner();
});
