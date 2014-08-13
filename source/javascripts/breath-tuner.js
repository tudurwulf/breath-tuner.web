// BreathTuner
//
// Terms used:
// * 1 breath:       1 exhalation AND 1 inhalation
// * 1 half-breath:  1 exhalation OR  1 inhalation
(function (doc, $) {
  'use strict';

  var running,           // Is the tuner running? ID used by setTimeout().
      breathIndex,       // Index of current breath.
      exhaling,          // Currently exhaling?
      halfBreathStart,   // Timestamp when the current half-breath started.
      halfBreathSplit,   // Elapsed milliseconds since the current half-breath
                         // started.
      maxMS,             // Max milliseconds that can be rendered per
                         // half-breath.
      minMS,             // Min milliseconds that can be rendered.
      maxBreaths,        // Maximum breaths that can be rendered. Also used to
                         // set the width of the canvas.
      xCursor,           // X-position of the current breath relative to the
                         // left canvas edge.
      tCursor,           // Time cursor: how many milliseconds of the current
                         // half-breath have been rendered.
      barWidth,          // Bar width.
      barHeight,         // Bar height.
      barHSpace,         // Vertical space between bars.
      barVSpace,         // Horizontal space between bars.
      xAxisHeight,       // X-axis height.
      canvasWidth,       // Canvas width.
      canvasHeight,      // Canvas height.
      exhOrigin,         // Coordinate of x-axis' top edge.
      inhOrigin,         // Coordinate of x-axis' bottom edge.
      colors,            // Bar & graticule colors.
      stats,             // Statistics. Calculated incrementally at the end of
                         // each breath.
      canvas,            // Canvas object.
      canvasContext,     // Canvas object context.
      breathNoDisplay,   // Breath number display.
      exhLenDisplay,     // Exhalation length display.
      inhLenDisplay,     // Inhalation length display.
      statsDisplay;      // Statistics display.

  function init() {
    running = null;
    breathIndex = -1;
    exhaling = false;
    halfBreathStart = null;
    halfBreathSplit = 0;
    maxMS = 35000;
    tCursor = 0;
    maxBreaths = 100;
    barHeight = 5;
    minMS = 1000 / barHeight;
    barWidth = barHeight * 4;
    barHSpace = 2;
    barVSpace = 4;
    xAxisHeight = 2;
    canvasHeight =  xAxisHeight +
                    (barHSpace + barHeight) * (maxMS / 1000) * 2;
    canvasWidth = (barWidth + barVSpace) * maxBreaths - barVSpace;
    exhOrigin = canvasHeight / 2 - xAxisHeight / 2;
    inhOrigin = canvasHeight / 2 + xAxisHeight / 2;
    xCursor = 0;
    colors = {
      red:    'hsl(  0, 80%, 50%)',
      orange: 'hsl( 30, 80%, 50%)',
      yellow: 'hsl( 60, 80%, 50%)',
      green:  'hsl(130, 80%, 50%)',
      cyan:   'hsl(185, 80%, 50%)',
      blue:   'hsl(210, 80%, 50%)',
      violet: 'hsl(265, 80%, 50%)',
      purple: 'hsl(315, 80%, 50%)'
    };
    stats = [];
    stats[-1] = {
      exhLen: 0,
      exhSum: 0,
      exhAvg: 0,
      exhRatio: 0,

      inhLen: 0,
      inhSum: 0,
      inhAvg: 0,
      inhRatio: 0,

      breathLen: 0,
      breathSum: 0,
      breathAvg: 0
    };
    canvas = $('#canvas');
    canvasContext = canvas[0].getContext('2d');
    breathNoDisplay = $('#breathNo');
    exhLenDisplay = $('#exhLen');
    inhLenDisplay = $('#inhLen');
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
    canvas[0].width = canvasWidth;
    canvas[0].height = canvasHeight;

    $('#chart')
      .css('height', canvasHeight + 2 * (barHeight + barHSpace) + 'px');

    canvas
      .css('top', barHeight + barHSpace + 'px');

    $('#xAxis')
      .css('height', xAxisHeight + 'px')
      .css('margin-top', - xAxisHeight / 2 + 'px');

    $('#graticule')
      .css('width', barWidth + 'px')
      .css('height', canvasHeight + 2 * barHSpace + 'px')
      .css('border-top', barHeight + 'px solid ' + colors.purple)
      .css('border-bottom', barHeight + 'px solid ' + colors.purple)
      .css('margin-left', - barWidth / 2 + 'px');

    updateCanvasPosition();
    bindControls();
  }

  // Depicts time as bars on the canvas.
  function renderTime() {

    // Get milliseconds since current half-breath started
    halfBreathSplit = new Date() - halfBreathStart;

    // Round to deciseconds, but stay in milli
    halfBreathSplit = Math.round(halfBreathSplit / 100) * 100;

    // Project tCursor's next position, so we don't render more than the elapsed time
    var tCursorNext;

    while (
      (tCursorNext = tCursor + minMS) <= halfBreathSplit &&
      tCursor < maxMS
    ) {

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
      updateExhLenDisplay(halfBreathSplit);
    else
      updateInhLenDisplay(halfBreathSplit);
  }

  function run() {
    renderTime();
    running = setTimeout(run, 100);
  }

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

  // Switches from exhaling to inhaling or vice versa.
  function switchBreath() {

    // Protect the user from double key press
    if (!halfBreathStart || new Date() - halfBreathStart > 2000) {
      stop();

      // Do not continue if max breaths reached
      if (!exhaling && breathIndex + 1 == maxBreaths)
        return;

      tCursor = 0;
      exhaling = !exhaling;

      if (exhaling) {
        breathIndex++;
        updateCanvasPosition();
        updateBreathNoDisplay();
      }

      halfBreathStart = new Date();
      run();
    }
  }

  // Stops the tuner and deletes the last breath.
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
      updateExhLenDisplay();
      updateInhLenDisplay();
      updateStatsDisplay();
    }
  }

  // Calculates and stores statistics.
  function pushStats() {
    if (exhaling) {
      // Init a stats row
      stats[breathIndex] = {};

      stats[breathIndex].exhLen = halfBreathSplit;

      if (breathIndex > 0) {
        stats[breathIndex].exhSum = stats[breathIndex - 1].exhSum +
                                    stats[breathIndex].exhLen;
      } else {
        stats[breathIndex].exhSum = stats[breathIndex].exhLen;
      }

      stats[breathIndex].exhAvg = stats[breathIndex].exhSum /
                                  (breathIndex + 1);

    // IF inhaling
    } else {
      stats[breathIndex].inhLen = halfBreathSplit;

      stats[breathIndex].breathLen =  stats[breathIndex].exhLen +
                                      stats[breathIndex].inhLen;

      if (breathIndex > 0) {
        stats[breathIndex].inhSum = stats[breathIndex - 1].inhSum +
                                    stats[breathIndex].inhLen;

        stats[breathIndex].breathSum =  stats[breathIndex - 1].breathSum +
                                        stats[breathIndex].breathLen;

      } else {
        stats[breathIndex].inhSum = stats[breathIndex].inhLen;

        stats[breathIndex].breathSum = stats[breathIndex].breathLen;
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

  // Updates the canvas' horizontal position so the current breath is aligned
  // with the graticule. Also updates xCursor.
  function updateCanvasPosition() {
    xCursor = (barWidth + barVSpace) * breathIndex;
    canvas.css('margin-left', barWidth / 2 + barVSpace -
                              (barWidth + barVSpace) * (breathIndex + 1) +
                              'px');
  }

  function updateBreathNoDisplay() {
    breathNoDisplay.html(breathIndex + 1);
  }

  function updateExhLenDisplay(time) {
    if (time === undefined)
      time = stats[breathIndex].exhLen;
    exhLenDisplay.html( (time / 1000).toFixed(1) );
  }

  function updateInhLenDisplay(time) {
    if (time === undefined)
      time = stats[breathIndex].inhLen;
    inhLenDisplay.html( (time / 1000).toFixed(1) );
  }

  // 61250 -> 61.3
  function formatSeconds(i) {
    return (i / 1000).toFixed(1);
  }

  // 61250 -> 1:01.3
  function formatMinutes(i) {
    var m = Math.floor(i / 60000);
    var s = i % 60000 / 1000;
    return m + ':' + ( '0' + s.toFixed(1) ).slice(-4);
  }

  // 49.58 -> 49.6%
  function formatRatio(i) {
    return i.toFixed(1) + '%';
  }

  function updateStatsDisplay() {
    statsDisplay.exhSum.html( formatMinutes(stats[breathIndex].exhSum) );
    statsDisplay.exhAvg.html( formatSeconds(stats[breathIndex].exhAvg) );
    statsDisplay.exhRatio.html( formatRatio(stats[breathIndex].exhRatio) );

    statsDisplay.inhSum.html( formatMinutes(stats[breathIndex].inhSum) );
    statsDisplay.inhAvg.html( formatSeconds(stats[breathIndex].inhAvg) );
    statsDisplay.inhRatio.html( formatRatio(stats[breathIndex].inhRatio) );

    statsDisplay.breathSum.html( formatMinutes(stats[breathIndex].breathSum) );
    statsDisplay.breathAvg.html( formatSeconds(stats[breathIndex].breathAvg) );
  }

  function bindControls() {

    // Bind buttons
    $('#switch').click(switchBreath);
    $('#stop').click(stop);
    $('#back').click(back);

    // Bind keys
    $(doc).keydown(function(e) {
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
  }

  $(init);

})(document, jQuery);
