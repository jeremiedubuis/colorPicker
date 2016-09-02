var ColorPicker;

(function() {

    /**
     * ================================================================================
     *                                  DEPENDENCIES
     * ================================================================================
     */

    /**
     * @desc An equivalent to jQuery's extend, a mixin function that extends an object with another,
     * @param object1: object to be complemented
     * @param object2: object's properties will be applied to object1
     */
    var extend = function() {
        for(var i=1; i<arguments.length; i++)
            for(var key in arguments[i])
                if(arguments[i].hasOwnProperty(key))
                    arguments[0][key] = arguments[i][key];
        return arguments[0];
    };

    /**
     * @desc An equivalent to jquery's offset function that allows to get an element's offset to top left corner of document
     * @param  function, [DOM node]
     */
    var offset = function (el) {

        var rect = el.getBoundingClientRect()

        return {
            top: rect.top + document.body.scrollTop,
            left: rect.left + document.body.scrollLeft
        };

    };

    /**
     * Transforms R,G,B into a single hexadecimal number
     * @param R {int}
     * @param G {int}
     * @param B {int}
     * @returns {hex}
     */
    var rgbToHex = function(R,G,B) {return toHex(R)+toHex(G)+toHex(B)};

    /**
     * Transforms int into hex
     * @param n {int}
     * @returns {hex}
     */
    var toHex = function(n) {
        n = parseInt(n,10);
        if (isNaN(n)) return "00";
        n = Math.max(0,Math.min(n,255));
        return "0123456789ABCDEF".charAt((n-n%16)/16)  + "0123456789ABCDEF".charAt(n%16);
    };

    /**
     * ================================================================================
     *                                  ColorPicker
     * ================================================================================
     */

    var _defaults = {
        onPick: function(color) {},
        tintPickerWidth : 30,
        borderWidth: 5,
        borderColor: 'black',
    };

    // colors used to generate tint gradient
    var colors = ['red','magenta', 'blue', 'cyan', 'green', 'yellow', 'red'];

    ColorPicker = function(trigger, canvasWrapper, options) {
        this.init(trigger, canvasWrapper, options);
    };

    ColorPicker.prototype = {

        toggled: false,

        /**
         * Starts up the pluging binding variables, methods, adding listeners
         * and rendering initial state
         * @param trigger {DOM el}
         * @param canvasWrapper {DOM el}
         * @param options {obj} ColorPicker options that will override _defaults
         */
        init: function(trigger, canvasWrapper, options) {
            this.trigger = trigger;
            this.canvasWrapper = canvasWrapper;
            this.canvas = canvasWrapper.getElementsByTagName('canvas')[0];
            this.c2d = this.canvas.getContext('2d');
            this.canvas.width =  this.canvas.parentNode.offsetWidth;
            this.canvas.height = this.canvas.parentNode.offsetHeight;

            this.fn = {
                onClick: this.onClick.bind(this),
                toggle: this.toggle.bind(this)
            };

            this.o = extend(_defaults, options);

            this.setSizes();
            this.drawTintPicker();

            this.selectTint(this.sizes.right, this.canvas.height/2);
            this.selectContrast(this.o.borderWidth, this.sizes.bottom);

            this.trigger.addEventListener('click', this.fn.toggle);
            this.canvasWrapper.addEventListener('click', this.fn.onClick);
        },

        /**
         * sets up size variables that will be used to render the tint picker
         * and the contrast picker within bounds of borders
         */
        setSizes: function() {
            this.sizes = {
                right: this.canvas.width-this.o.borderWidth,
                bottom: this.canvas.height - this.o.borderWidth
            };
            // these sizes are applied to canvas fillRect
            this.sizes.tint = [
                this.canvas.width - this.o.tintPickerWidth - this.o.borderWidth ,
                this.o.borderWidth,
                this.sizes.right-this.o.borderWidth,
                this.sizes.bottom - this.o.borderWidth
            ];
            this.sizes.contrast = [
                this.o.borderWidth,
                this.o.borderWidth,
                this.canvas.width - 3* this.o.borderWidth - this.o.tintPickerWidth ,
                this.sizes.bottom - this.o.borderWidth
            ];
        },

        /**
         * toggles the colorpicker on click on the trigger
         * @param e {event}
         */
        toggle: function(e) {
            if (this.toggled) {
                this.trigger.className = this.trigger.className.replace(' color-picker-toggled', '');
                this.canvasWrapper.className = this.canvasWrapper.className.replace(' color-picker-toggled', '');
                this.toggled = 0;
            } else {
                this.trigger.className += ' color-picker-toggled';
                this.canvasWrapper.className += ' color-picker-toggled';
                this.toggled = 1;
            }
        },

        /**
         * Gets coordinates whenever user clicks on colorPicker to determine if
         * it should update tint or contrast
         * @param e {event}
         */
        onClick: function(e) {
            var _offset = offset(e.currentTarget);
            var x = e.pageX - _offset.left;
            var y = e.pageY - _offset.top;

            if (x > this.o.borderWidth && x<this.sizes.right && y>this.o.borderWidth && y< this.sizes.bottom) {

                // if click in right hand area of the picker (color picker)
                if (x > this.canvas.width-this.o.tintPickerWidth) {
                    this.selectTint(x,y);
                    this.selectContrast(this.cursor.x,this.cursor.y);
                } else {
                    this.selectContrast(x,y);
                }
            }
        },

        /**
         * Selects tint from x and y on canvas, then renders the colorPicker again
         * and places the cursor
         * @param x
         * @param y
         */
        selectTint: function(x,y) {
            this.tint = this.clickPositionToHex(x, y);
            this.drawContrastPicker();
            this.drawTintPicker();
            this.drawTintCursor(y);
        },

        /**
         * Selects contrast from x and y on canvas and sets color, then renders the
         * contrast picker again and places the cursor
         * @param x
         * @param y
         */
        selectContrast: function(x,y) {
            this.color = this.clickPositionToHex(x, y);
            this.o.onPick(this.color);
            this.drawContrastPicker();
            this.drawContrastCursor(x,y);
        },

        /**
         * picks the color at coordinates on canvas
         * @param x
         * @param y
         * @returns {string}
         */
        clickPositionToHex: function(x, y) {
            var data = this.c2d.getImageData(x, y, 1, 1).data;
            return "#"+rgbToHex(data[0],data[1],data[2]);
        },

        /**
         * Renders tint picker on canvas
         */
        drawTintPicker: function() {

            var gradient = this.c2d.createLinearGradient.apply(this.c2d, this.sizes.tint);
            var colorRange = 1 / colors.length;

            for (var i = 0, j = colors.length; i<j; ++i ) {
                gradient.addColorStop(i*colorRange,colors[i]);
            }

            this.c2d.fillStyle=gradient;
            this.c2d.fillRect.apply(this.c2d, this.sizes.tint);

        },

        /**
         * Renders contrast picker on canvas
         */
        drawContrastPicker: function() {

            var gradient = this.c2d.createLinearGradient.apply(this.c2d, this.sizes.contrast);
            gradient.addColorStop(0,'white');
            gradient.addColorStop(1,this.tint);
            this.c2d.fillStyle=gradient;
            this.c2d.fillRect.apply(this.c2d, this.sizes.contrast);

            gradient = this.c2d.createLinearGradient(0, this.o.borderWidth,0, this.canvas.height-this.o.borderWidth*2);
            gradient.addColorStop(0,'transparent');
            gradient.addColorStop(1,'black');
            this.c2d.fillStyle=gradient;
            this.c2d.fillRect.apply(this.c2d, this.sizes.contrast);

        },

        drawTintCursor: function(y) {
            this.c2d.beginPath();
            this.c2d.lineWidth=2;
            this.c2d.moveTo(this.sizes.right-this.o.tintPickerWidth,y);
            this.c2d.lineTo(this.canvas.width, y);
            this.c2d.strokeStyle = "white";
            this.c2d.stroke();
        },
        
        drawContrastCursor: function(x,y) {

            this.c2d.beginPath();
            x = Math.min(Math.max(x,this.o.borderWidth+7), this.sizes.right-this.o.tintPickerWidth-this.o.borderWidth-7); // minus radius
            y = Math.min(Math.max(y,this.o.borderWidth+7), this.sizes.bottom-7); // minus radius
            this.cursor = {x: x, y:y};
            this.c2d.arc(x,y,4,0,2*Math.PI);
            this.c2d.strokeStyle = 'white';
            this.c2d.lineWidth=3;
            this.c2d.stroke();
        },

        /**
         * removes listeners
         */
        destroy: function() {
            this.canvasWrapper.removeEventListener('click', this.fn.onClick);
            this.trigger.removeEventListener('click', this.fn.toggle);
        }

    };

})();