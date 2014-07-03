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

      /** ID used by setInterval(). */
      intervalID = null,

      /** Current breath's index. */
      breathIndex = -1,

      /** Currently exhaling? */
      exhaling = false,

      /** Time when current half-breath started. */
      halfBreathStartTime = null,

      /** Max second that can be represented per half-breath. */
      maxSecond = 35,

      /** Last second represented for the current half-breath. */
      lastSecond = 0,

      /** Maximum breaths supported. Used to set the width of the canvas. */
      maxBreaths = 100,

      /** Bar width. */
      barWidth = 20,

      /** Bar height. */
      barHeight = 5,

      /** Horizontal space between bars. */
      barHSpace = 2,

      /** Vertical space between bars. */
      barVSpace = 4,

      /** X-axis height. */
      xAxisHeight = 2,

      /** Canvas height. */
      canvasHeight = xAxisHeight +
                    (barHSpace + barHeight) * maxSecond * 2 +
                    (barHSpace + barHeight) * 2, // graticule marks

      /** Canvas width. */
      canvasWidth = (barWidth + barVSpace) * maxBreaths - barVSpace,

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

      /** Canvas object. */
      canvas = $('#canvas'),

      /** Canvas object context. */
      canvasContext = canvas[0].getContext('2d'),

      /** Breath number display. */
      breathNoDisplay = $('#breathNo'),

      /** Exhalation timer display. */
      exhalationTimerDisplay = $('#exhalationTimer'),

      /** Inhalation timer display. */
      inhalationTimerDisplay = $('#inhalationTimer');

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
   * with the graticule.
   */
  function updateCanvasPosition() {
    canvas.css('margin-left', barWidth / 2 + barVSpace -
                              (barWidth + barVSpace) * (breathIndex + 1) +
                              'px');
  }

  /**
   * Draws the time spent breathing as bars on the canvas.
   */
  function drawChart() {
    // Get milliseconds since current half-breath started
    var elapsed = new Date() - halfBreathStartTime;

    // Convert to seconds with one decimal
    //
    // Example:
    //
    //   round(1245 / 100) / 10 => 1.2
    //
    elapsed = Math.round(elapsed / 100) / 10;

    var currSecond = Math.floor(elapsed);

    if (
      // IF current second is greater than the last one...
      //
      // (since lastSecond is initialised with 0, this means that for the first
      // pass, currSecond will be 1)
      currSecond > lastSecond

      // AND currend second is smaller than the maximum second that can be
      // represented, then...
      && currSecond <= maxSecond
    ) {

      var xPos = (barWidth + barVSpace) * breathIndex;

      if (exhaling) {
        // Draw from x-axis upwards
        var yPos =  canvasHeight / 2 -
                    xAxisHeight / 2 -
                    (barHSpace + barHeight) * currSecond;
      } else {
        // Draw from x-axis downwards
        var yPos =  canvasHeight / 2 +
                    xAxisHeight / 2 +
                    barHSpace +
                    (barHeight + barHSpace) * (currSecond - 1);
      }

      if        (currSecond <  3) {
        canvasContext.fillStyle = colors.red;
      } else if (currSecond <  6) {
        canvasContext.fillStyle = colors.orange;
      } else if (currSecond < 10) {
        canvasContext.fillStyle = colors.yellow;
      } else if (currSecond < 15) {
        canvasContext.fillStyle = colors.green;
      } else if (currSecond < 20) {
        canvasContext.fillStyle = colors.cyan;
      } else if (currSecond < 25) {
        canvasContext.fillStyle = colors.blue;
      } else if (currSecond < 30) {
        canvasContext.fillStyle = colors.violet;
      } else {
        canvasContext.fillStyle = colors.purple;
      }

      canvasContext.fillRect( xPos,
                              yPos,
                              barWidth,
                              barHeight);

      lastSecond = currSecond;
    }

    if (exhaling)
      exhalationTimerDisplay.html(elapsed.toFixed(1));
    else
      inhalationTimerDisplay.html(elapsed.toFixed(1));
  }

  /**
   * Switches from exhaling to inhaling, and vice versa.
   */
  function switchBreath() {
    // Protect the user from double key press
    if (!halfBreathStartTime || new Date() - halfBreathStartTime > 1000) {
      stop();
      exhaling = !exhaling;
      start();
    }
  }

  /**
   * Starts the tuner.
   */
  function start() {
    if (!intervalID) {
      if (exhaling)
        breathIndex++;
      updateCanvasPosition();
      lastSecond = 0;
      breathNoDisplay.html(breathIndex + 1);
      halfBreathStartTime = new Date();
      intervalID = setInterval(function () {
        drawChart();
      }, 100);
    }
  }

  /**
   * Stops the tuner.
   */
  function stop() {
    if (intervalID) {
      clearInterval(intervalID);
      halfBreathStartTime = null;
      intervalID = null;
    }
  }

  /**
  * Stops the tuner and deletes the last breath.
  */
  function back() {
    if (breathIndex > -1) {
      stop();

      // Delete the last exhalation
      var xPos = (barWidth + barVSpace) * breathIndex;
      var yPos = 0;
      var width = barWidth;
      var height = (canvasHeight - xAxisHeight) / 2;
      canvasContext.clearRect(xPos, yPos, width, height);

      // Delete the last inhalation
      yPos = (canvasHeight + xAxisHeight) / 2;
      canvasContext.clearRect(xPos, yPos, width, height);

      breathIndex--;
      updateCanvasPosition();
      lastSecond = 0;
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
    intervalID ? stop() : start();
  }
}

$(function () {
  BreathTuner();
});
