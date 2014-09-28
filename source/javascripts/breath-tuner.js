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
      maxSeconds,        // Max seconds that can be rendered per half-breath.
      maxBreaths,        // Maximum breaths that can be rendered. Also used to
                         // set the width of the canvas.
      xCursor,           // X-position of the current breath relative to the
                         // left canvas edge.
      yCursor,           // Y-position of the last rendered pixel relative to an
                         // imaginary x-axis with no height.
      barWidth,          // Bar width.
      barHeight,         // Bar height.
      barHSpace,         // Vertical space between bars.
      barVSpace,         // Horizontal space between bars.
      xAxisHeight,       // X-axis height.
      oneSecondHeight,   // Height of 1 rendered second.
      maxYCursor,        // maxSeconds translated in pixels.
      canvasWidth,       // Canvas width.
      canvasHeight,      // Canvas height.
      exhOrigin,         // X-coordinate of x-axis' top edge.
      inhOrigin,         // X-coordinate of x-axis' bottom edge.
      colors,            // Bar & graticule colors.
      stats,             // Statistics. Calculated incrementally at the end of
                         // each breath.
      $canvas,           // Canvas object.
      canvasContext,     // Canvas object context.
      $breathNoDisplay,  // Breath number display.
      $exhLenDisplay,    // Exhalation length display.
      $inhLenDisplay,    // Inhalation length display.
      statsDisplay;      // Statistics display.

  function init() {
    running = null;
    breathIndex = -1;
    exhaling = false;
    halfBreathStart = null;
    halfBreathSplit = 0;
    maxSeconds = 35;
    maxBreaths = 100;
    barHeight = 5;
    barWidth = barHeight * 4;
    barHSpace = 2;
    barVSpace = 4;
    xAxisHeight = 2;
    oneSecondHeight = barHeight + barHSpace;
    maxYCursor = maxSeconds * oneSecondHeight;
    canvasHeight =  xAxisHeight +
                    (barHSpace + barHeight) * maxSeconds * 2;
    canvasWidth = (barWidth + barVSpace) * maxBreaths - barVSpace;
    exhOrigin = canvasHeight / 2 - xAxisHeight / 2;
    inhOrigin = canvasHeight / 2 + xAxisHeight / 2;
    xCursor = 0;
    yCursor = 0;
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
    $canvas = $('#canvas');
    canvasContext = $canvas[0].getContext('2d');
    $breathNoDisplay = $('#breathNo');
    $exhLenDisplay = $('#exhLen');
    $inhLenDisplay = $('#inhLen');
    statsDisplay = {
      $exhSum:   $('#exhSum'),
      $exhAvg:   $('#exhAvg'),
      $exhRatio: $('#exhRatio'),

      $inhSum:   $('#inhSum'),
      $inhAvg:   $('#inhAvg'),
      $inhRatio: $('#inhRatio'),

      $breathSum: $('#breathSum'),
      $breathAvg: $('#breathAvg')
    };
    $canvas[0].width = canvasWidth;
    $canvas[0].height = canvasHeight;

    $('#chart')
      .css('height', canvasHeight + 2 * (barHeight + barHSpace) + 'px');

    $canvas
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

  // Depicts time as bars on the canvas.
  function renderTime() {
    var targetYCursor,   // What value must yCursor reach.
        secondsRendered; // How many seconds have been rendered.

    // Get milliseconds since current half-breath started
    halfBreathSplit = new Date() - halfBreathStart;

    // Round to deciseconds, but stay in milli
    //
    // A rounding is needed because the final value displayed by timers is also
    // rounded by toFixed(). If we didn't round, the chart wouldn't match the
    // timers.
    //
    // We have to stay in milliseconds because halfBreathSplit is later used to
    // calculate statistics.
    halfBreathSplit = Math.round(halfBreathSplit / 100) * 100;

    // Calculate targetYCursor as if there were no horizontal spaces
    //
    // Rule of three:
    //   1000ms          -> barHeight
    //   halfBreathSplit -> targetYCursor
    targetYCursor = Math.floor(halfBreathSplit * barHeight / 1000);

    // Add horizontal spaces
    targetYCursor += Math.ceil(halfBreathSplit / 1000) * barHSpace;

    while (yCursor < targetYCursor && yCursor <= maxYCursor) {

      secondsRendered = yCursor / oneSecondHeight;

      // IF secondsRendered is an integer
      if (secondsRendered % 1 === 0) {
        yCursor += barHSpace;
      } else {
        if        (secondsRendered <  2) {
          canvasContext.fillStyle = colors.red;
        } else if (secondsRendered <  5) {
          canvasContext.fillStyle = colors.orange;
        } else if (secondsRendered < 10) {
          canvasContext.fillStyle = colors.yellow;
        } else if (secondsRendered < 15) {
          canvasContext.fillStyle = colors.green;
        } else if (secondsRendered < 20) {
          canvasContext.fillStyle = colors.cyan;
        } else if (secondsRendered < 25) {
          canvasContext.fillStyle = colors.blue;
        } else if (secondsRendered < 30) {
          canvasContext.fillStyle = colors.violet;
        } else {
          canvasContext.fillStyle = colors.purple;
        }

        canvasContext.fillRect(
          xCursor,
          exhaling ? exhOrigin - yCursor - 1 : inhOrigin + yCursor,
          barWidth,
          1
        );

        yCursor++;
      }
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

      yCursor = 0;
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

      // Clear last exhalation
      canvasContext.clearRect(xCursor, 0, barWidth, exhOrigin);
      // Clear last inhalation
      canvasContext.clearRect(xCursor, inhOrigin, barWidth, canvasHeight);

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
    $canvas.css('margin-left',  barWidth / 2 + barVSpace -
                                (barWidth + barVSpace) * (breathIndex + 1) +
                                'px');
  }

  function updateBreathNoDisplay() {
    $breathNoDisplay.html(breathIndex + 1);
  }

  function updateExhLenDisplay(ms) {
    if (ms === undefined)
      ms = stats[breathIndex].exhLen;
    $exhLenDisplay.html( (ms / 1000).toFixed(1) );
  }

  function updateInhLenDisplay(ms) {
    if (ms === undefined)
      ms = stats[breathIndex].inhLen;
    $inhLenDisplay.html( (ms / 1000).toFixed(1) );
  }

  // 61250 -> 61.3
  function formatSeconds(ms) {
    return (ms / 1000).toFixed(1);
  }

  // 61250 -> 1:01.3
  function formatMinutes(ms) {
    var m, // minutes
        s; // seconds
    m = Math.floor(ms / 60000);
    s = ms % 60000 / 1000;
    return m + ':' + ( '0' + s.toFixed(1) ).slice(-4);
  }

  // 49.58 -> 49.6%
  function formatRatio(ms) {
    return ms.toFixed(1) + '%';
  }

  function updateStatsDisplay() {
    statsDisplay.$exhSum.html( formatMinutes(stats[breathIndex].exhSum) );
    statsDisplay.$exhAvg.html( formatSeconds(stats[breathIndex].exhAvg) );
    statsDisplay.$exhRatio.html( formatRatio(stats[breathIndex].exhRatio) );

    statsDisplay.$inhSum.html( formatMinutes(stats[breathIndex].inhSum) );
    statsDisplay.$inhAvg.html( formatSeconds(stats[breathIndex].inhAvg) );
    statsDisplay.$inhRatio.html( formatRatio(stats[breathIndex].inhRatio) );

    statsDisplay.$breathSum.html( formatMinutes(stats[breathIndex].breathSum) );
    statsDisplay.$breathAvg.html( formatSeconds(stats[breathIndex].breathAvg) );
  }

  $(init);

})(document, jQuery);
