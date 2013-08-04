/**@license
 *|       __ _____                     ________                              __
 *|      / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___  / /
 *|  __ / // // // // // _  // _// // / / // _  // _//     // //  \/ // _ \/ /
 *| /  / // // // // // ___// / / // / / // ___// / / / / // // /\  // // / /__
 *| \___//____ \\___//____//_/ _\_  / /_//____//_/ /_/ /_//_//_/ /_/ \__\_\___/
 *|           \/              /____/                              version 0.3.6
 * http://terminal.jcubic.pl
 *
 * Licensed under GNU LGPL Version 3 license
 * Copyright (c) 2011 Jakub Jankiewicz <http://jcubic.pl>
 *
 * Includes:
 *
 * Storage plugin Distributed under the MIT License
 * Copyright (c) 2010 Dave Schindler
 * 
 * LiveQuery plugin Dual MIT and GPL
 * Copyright (c) 2008 Brandon Aaron (http://brandonaaron.net)
 *
 * jQuery Timers licenced with the WTFPL
 * <http://jquery.offput.ca/every/>
 *
 * Date: Tue, 09 Aug 2011 13:12:19 +0000
 */

/*

     TODO:
           add destroy method to terminal (cmd alrady have it)

           add support for - $(...).each(function() { ... });

           $.fn.pluginname = function(options) {
             var settings = $.extend({}, $.fn.pluginname.defaultOptions, options);

             return this.each(function() {
                var $this = $(this);
             });
             $.fn.pluginname.defaultOptions = {
             };
          };

          if (CTRL+D && ajax-call) {
            xhr.abort();
          }

          object as first arguments which maps commands arguments to methods
          context of functions will be the terminal instance.

          terminal({
            js: function(a, b, c) {
              this.echo(a + '__' + b + '__' + c);
            },
            mysql: function() {
              var query = Array.prototype.splice(argument, 0).join(' ');
            }
          });
    
          if you type 'js foo bar baz' it will call js('foo', 'bar', 'baz');



*/
// return true if value is in array
Array.prototype.has = function(val) {
    for (var i = this.length; i--;) {
        if (this[i] == val) {
            return true;
        }
    }
    return false;
};

// debug function
function get_stack(caller) {
    if (caller) {
        return [caller.toString().match(/.*\n.*\n/)].concat(get_stack(caller.caller));
    } else {
        return [];
    }
}

(function($, undefined) {
    
    // ----------------------------------------
    // START Live Query plugin
    // ----------------------------------------
    $.extend($.fn, {
	    livequery: function(type, fn, fn2) {
		    var self = this, q;
		    
		    // Handle different call patterns
		    if ($.isFunction(type))
			    fn2 = fn, fn = type, type = undefined;
			
		    // See if Live Query already exists
		    $.each( $.livequery.queries, function(i, query) {
			    if ( self.selector == query.selector && self.context == query.context &&
				     type == query.type && (!fn || fn.$lqguid == query.fn.$lqguid) && (!fn2 || fn2.$lqguid == query.fn2.$lqguid) )
					// Found the query, exit the each loop
					return (q = query) && false;
		    });
		    
		    // Create new Live Query if it wasn't found
		    q = q || new $.livequery(this.selector, this.context, type, fn, fn2);
		    
		    // Make sure it is running
		    q.stopped = false;
		    
		    // Run it immediately for the first time
		    q.run();
		    
		    // Contnue the chain
		    return this;
	    },
	    
	    expire: function(type, fn, fn2) {
		    var self = this, x =10;
		    
		    // Handle different call patterns
		    if ($.isFunction(type))
			    fn2 = fn, fn = type, type = undefined;
			
		    // Find the Live Query based on arguments and stop it
		    $.each( $.livequery.queries, function(i, query) {
			    if ( self.selector == query.selector && self.context == query.context && 
				     (!type || type == query.type) && (!fn || fn.$lqguid == query.fn.$lqguid) && (!fn2 || fn2.$lqguid == query.fn2.$lqguid) && !this.stopped )
					$.livequery.stop(query.id);
		    });
		    
		    // Continue the chain
		    return this;
	    }
    });

    $.livequery = function(selector, context, type, fn, fn2) {
	    this.selector = selector;
	    this.context  = context || document;
	    this.type     = type;
	    this.fn       = fn;
	    this.fn2      = fn2;
	    this.elements = [];
	    this.stopped  = false;
	    
	    // The id is the index of the Live Query in $.livequery.queries
	    this.id = $.livequery.queries.push(this)-1;
	    
	    // Mark the functions for matching later on
	    fn.$lqguid = fn.$lqguid || $.livequery.guid++;
	    if (fn2) fn2.$lqguid = fn2.$lqguid || $.livequery.guid++;
	    
	    // Return the Live Query
	    return this;
    };

    $.livequery.prototype = {
	    stop: function() {
		    var query = this;
		    
		    if ( this.type )
			    // Unbind all bound events
			    this.elements.unbind(this.type, this.fn);
		    else if (this.fn2)
			    // Call the second function for all matched elements
			    this.elements.each(function(i, el) {
				    query.fn2.apply(el);
			    });
			
		    // Clear out matched elements
		    this.elements = [];
		    
		    // Stop the Live Query from running until restarted
		    this.stopped = true;
	    },
	    
	    run: function() {
		    // Short-circuit if stopped
		    if ( this.stopped ) return;
		    var query = this;
		    
		    var oEls = this.elements,
			els  = $(this.selector, this.context),
			nEls = els.not(oEls);
		    
		    // Set elements to the latest set of matched elements
		    this.elements = els;
		    
		    if (this.type) {
			    // Bind events to newly matched elements
			    nEls.bind(this.type, this.fn);
			    
			    // Unbind events to elements no longer matched
			    if (oEls.length > 0)
				    $.each(oEls, function(i, el) {
					    if ( $.inArray(el, els) < 0 )
						    $.event.remove(el, query.type, query.fn);
				    });
		    }
		    else {
			    // Call the first function for newly matched elements
			    nEls.each(function() {
				    query.fn.apply(this);
			    });
			    
			    // Call the second function for elements no longer matched
			    if ( this.fn2 && oEls.length > 0 )
				    $.each(oEls, function(i, el) {
					    if ( $.inArray(el, els) < 0 )
						    query.fn2.apply(el);
				    });
		    }
	    }
    };

    $.extend($.livequery, {
	    guid: 0,
	    queries: [],
	    queue: [],
	    running: false,
	    timeout: null,
	    
	    checkQueue: function() {
		    if ( $.livequery.running && $.livequery.queue.length ) {
			    var length = $.livequery.queue.length;
			    // Run each Live Query currently in the queue
			    while ( length-- )
				    $.livequery.queries[ $.livequery.queue.shift() ].run();
		    }
	    },
	    
	    pause: function() {
		    // Don't run anymore Live Queries until restarted
		    $.livequery.running = false;
	    },
	    
	    play: function() {
		    // Restart Live Queries
		    $.livequery.running = true;
		    // Request a run of the Live Queries
		    $.livequery.run();
	    },
	    
	    registerPlugin: function() {
		    $.each( arguments, function(i,n) {
			    // Short-circuit if the method doesn't exist
			    if (!$.fn[n]) return;
			    
			    // Save a reference to the original method
			    var old = $.fn[n];
			    
			    // Create a new method
			    $.fn[n] = function() {
				    // Call the original method
				    var r = old.apply(this, arguments);
				    
				    // Request a run of the Live Queries
				    $.livequery.run();
				    
				    // Return the original methods result
				    return r;
			    }
		    });
	    },
	    
	    run: function(id) {
		    if (id != undefined) {
			    // Put the particular Live Query in the queue if it doesn't already exist
			    if ( $.inArray(id, $.livequery.queue) < 0 )
				    $.livequery.queue.push( id );
		    }
		    else
			    // Put each Live Query in the queue if it doesn't already exist
			    $.each( $.livequery.queries, function(id) {
				    if ( $.inArray(id, $.livequery.queue) < 0 )
					    $.livequery.queue.push( id );
			    });
		    
		    // Clear timeout if it already exists
		    if ($.livequery.timeout) clearTimeout($.livequery.timeout);
		    // Create a timeout to check the queue and actually run the Live Queries
		    $.livequery.timeout = setTimeout($.livequery.checkQueue, 20);
	    },
	    
	    stop: function(id) {
		    if (id != undefined)
			    // Stop are particular Live Query
			    $.livequery.queries[ id ].stop();
		    else
			    // Stop all Live Queries
			    $.each( $.livequery.queries, function(id) {
				    $.livequery.queries[ id ].stop();
			    });
	    }
    });

    // Register core DOM manipulation methods
    $.livequery.registerPlugin('append', 'prepend', 'after', 'before', 'wrap', 'attr', 'removeAttr', 'addClass', 'removeClass', 'toggleClass', 'empty', 'remove');

    // Run Live Queries when the Document is ready
    $(function() { $.livequery.play(); });


    // Save a reference to the original init method
    var init = $.prototype.init;

    // Create a new init method that exposes two new properties: selector and context
    $.prototype.init = function(a,c) {
	    // Call the original init and save the result
	    var r = init.apply(this, arguments);
	    
	    // Copy over properties if they exist already
	    if (a && a.selector)
		    r.context = a.context, r.selector = a.selector;
		
	    // Set properties
	    if ( typeof a == 'string' )
		    r.context = c || document, r.selector = a;
	    
	    // Return the result
	    return r;
    };

    // Give the init function the jQuery prototype for later instantiation
    // (needed after Rev 4091)
    $.prototype.init.prototype = $.prototype; 
    // ----------------------------------------
    // START Storage plugin
    // ----------------------------------------
    // Private data
    var isLS = typeof window.localStorage !== 'undefined';
    // Private functions
    function wls(n, v) {
        var c;
        if (typeof n === 'string' && typeof v === 'string') {
            localStorage[n] = v;
            return true;
        } else if (typeof n === 'object' && typeof v === 'undefined') {
            for (c in n) {
                if (n.hasOwnProperty(c)) {
                    localStorage[c] = n[c];
                }
            }
            return true;
        }
        return false;
    }
    function wc(n, v) {
        var dt, e, c;
        dt = new Date();
        dt.setTime(dt.getTime() + 31536000000);
        e = '; expires=' + dt.toGMTString();
        if (typeof n === 'string' && typeof v === 'string') {
            document.cookie = n + '=' + v + e + '; path=/';
            return true;
        } else if (typeof n === 'object' && typeof v === 'undefined') {
            for (c in n) {
                if (n.hasOwnProperty(c)) {
                    document.cookie = c + '=' + n[c] + e + '; path=/';
                }
            }
            return true;
        }
        return false;
    }
    function rls(n) {
        return localStorage[n];
    }
    function rc(n) {
        var nn, ca, i, c;
        nn = n + '=';
        ca = document.cookie.split(';');
        for (i = 0; i < ca.length; i++) {
            c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nn) === 0) {
                return c.substring(nn.length, c.length);
            }
        }
        return null;
    }
    function dls(n) {
        return delete localStorage[n];
    }
    function dc(n) {
        return wc(n, '', -1);
    }
    /**
    * Public API
    * $.Storage.set("name", "value")
    * $.Storage.set({"name1":"value1", "name2":"value2", etc})
    * $.Storage.get("name")
    * $.Storage.remove("name")
    */
    $.extend({
        Storage: {
            set: isLS ? wls : wc,
            get: isLS ? rls : rc,
            remove: isLS ? dls : dc
        }
    });
    // ----------------------------------------
    // END Storage plugin
    // ----------------------------------------
    // START jQuery Timers
    // ----------------------------------------
    jQuery.fn.extend({
        everyTime: function(interval, label, fn, times, belay) {
            return this.each(function() {
                jQuery.timer.add(this, interval, label, fn, times, belay);
            });
        },
        oneTime: function(interval, label, fn) {
            return this.each(function() {
                jQuery.timer.add(this, interval, label, fn, 1);
            });
        },
        stopTime: function(label, fn) {
            return this.each(function() {
                jQuery.timer.remove(this, label, fn);
            });
        }
    });

    jQuery.extend({
        timer: {
            guid: 1,
            global: {},
            regex: /^([0-9]+)\s*(.*s)?$/,
            powers: {
                // Yeah this is major overkill...
                'ms': 1,
                'cs': 10,
                'ds': 100,
                's': 1000,
                'das': 10000,
                'hs': 100000,
                'ks': 1000000
            },
            timeParse: function(value) {
                if (value == undefined || value == null)
                    return null;
                var result = this.regex.exec(jQuery.trim(value.toString()));
                if (result[2]) {
                    var num = parseInt(result[1], 10);
                    var mult = this.powers[result[2]] || 1;
                    return num * mult;
                } else {
                    return value;
                }
            },
            add: function(element, interval, label, fn, times, belay) {
                var counter = 0;

                if (jQuery.isFunction(label)) {
                    if (!times)
                        times = fn;
                    fn = label;
                    label = interval;
                }

                interval = jQuery.timer.timeParse(interval);

                if (typeof interval != 'number' ||
                    isNaN(interval) ||
                    interval <= 0) {
                    return;
                }
                if (times && times.constructor != Number) {
                    belay = !!times;
                    times = 0;
                }

                times = times || 0;
                belay = belay || false;

                if (!element.$timers)
                    element.$timers = {};

                if (!element.$timers[label])
                    element.$timers[label] = {};

                fn.$timerID = fn.$timerID || this.guid++;

                var handler = function() {
                    if (belay && this.inProgress)
                        return;
                    this.inProgress = true;
                    if ((++counter > times && times !== 0) ||
                        fn.call(element, counter) === false)
                        jQuery.timer.remove(element, label, fn);
                    this.inProgress = false;
                };

                handler.$timerID = fn.$timerID;

                if (!element.$timers[label][fn.$timerID])
                    element.$timers[label][fn.$timerID] = window.setInterval(handler, interval);

                if (!this.global[label])
                    this.global[label] = [];
                this.global[label].push(element);

            },
            remove: function(element, label, fn) {
                var timers = element.$timers, ret;

                if (timers) {

                    if (!label) {
                        for (label in timers)
                            this.remove(element, label, fn);
                    } else if (timers[label]) {
                        if (fn) {
                            if (fn.$timerID) {
                                window.clearInterval(timers[label][fn.$timerID]);
                                delete timers[label][fn.$timerID];
                            }
                        } else {
                            for (var fn in timers[label]) {
                                window.clearInterval(timers[label][fn]);
                                delete timers[label][fn];
                            }
                        }

                        for (ret in timers[label]) break;
                        if (!ret) {
                            ret = null;
                            delete timers[label];
                        }
                    }

                    for (ret in timers) break;
                    if (!ret)
                        element.$timers = null;
                }
            }
        }
    });

    if (jQuery.browser.msie) {
        jQuery(window).one('unload', function() {
            var global = jQuery.timer.global;
            for (var label in global) {
                var els = global[label], i = els.length;
                while (--i)
                    jQuery.timer.remove(els[i], label);
            }
        });
    }

    // -----------------------------------------------------------------------
    /*
    function decodeHTML(str) {
        if (typeof str == 'string') {
            str = str.replace(/&amp;/g, '&');
            str = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            str = str.replace(/&#09;/g, '\t');
            str = str.replace(/<br\/?>/g, '\n').replace(/&nbsp;/g, ' ');
            return str;
        } else {
            return '';
        }
    }
    */
    //split string to array of strings with the same length
    function str_parts(str, length) {
        var result = [];
        var len = str.length;
        if (len < length) {
            return [str];
        }
        for (var i = 0; i < len; i += length) {
            result.push(str.substring(i, i + length));
        }
        return result;
    }
    // -----------------------------------------------------------------------
    //bar</span>baz
    
    var format_split_re = /(\[\[[biu]*;[^;]*;[^\]]*\][^\]]*\])/g;
    // this capture elements
    var format_re = /\[\[([biu]*);([^;]*);([^\]]*)\]([^\]]*)\]/g;
    //var format_re = /\[\[([biu]*);([^;]*);([^\]]*)\]([^\[][^\]]*|\[[^\]]*\][^\]]*)\]/g;
    var color_hex_re = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})/;
    function encodeHTML(str) {
        if (typeof str == 'string') {
            str = str.replace(/&(?!#[0-9]*;)/g, '&amp;');
            str = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            str = str.replace(/\n/g, '<br/>'); // I don't think that it find this
            str = str.replace(/ /g, '&nbsp;');
            //str = str.replace(/---/g, '&mdash;');
            //str = str.replace(/\.\.\./g, '&hellip;');
            //str = str.replace(/sqrt\(([^\)]+)\)/g, "&radic;$1")
            //str = str.replace(/sum\(([^\)]+)\)/g, "&sum;$1");
            str = str.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
            //support for formating foo[[u;;]bar]baz[[b;#fff;]quuz]zzz
            var splited = str.split(format_split_re);
            if (splited.length > 1) {
                str = $.map(splited, function(text) {
                    if (text[0] == '[') {
                        return text.replace(format_re, function(s, style, color, background, text) {
                            var style_str = '';
                            if (style.indexOf('b') != -1) {
                                style_str += 'font-weight:bold;';
                            }
                            if (style.indexOf('u') != -1) {
                                style_str += 'text-decoration:underline;';
                            }
                            if (style.indexOf('i') != -1) {
                                style_str += 'font-style:italic; ';
                            }
                            
                            if (color.match(color_hex_re)) {
                                style_str += 'color:' + color + ';';
                            }
                            if (background.match(color_hex_re)) {
                                style_str += 'background-color:' + background;
                            }
                            str = '<span style="' + style_str + '">' + text + '</span>';
                            return str;
                        });
                    } else {
                        return '<span>' + text + '</span>';
                    }
                }).join('');
            }
            return str;
        } else {
            return '';
        }
    }
    
    // -----------------------------------------------------------------------
    // CYCLE DATA STRUCTURE
    // -----------------------------------------------------------------------
    function Cycle(init) {
        var data = init ? [init] : [];
        var pos = 0;
        $.extend(this, {
            rotate: function() {
                if (data.length == 1) {
                    return data[0];
                } else {
                    if (pos == data.length - 1) {
                        pos = 0;
                    } else {
                        ++pos;
                    }
                    return data[pos];
                }
            },
            length: function() {
                return data.length;
            },
            set: function(item) {
                for (var i = data.length; i--;) {
                    if (data[i] === item) {
                        pos = i;
                        return;
                    }
                }
                this.append(item);
            },
            front: function() {
                return data[pos];
            },
            append: function(item) {
                data.push(item);
            }
        });
    }
    // -----------------------------------------------------------------------
    // :: BCYCLE DATA STRUCTURE // Two way cycle
    // -----------------------------------------------------------------------
    function BCycle(init) {
        var data = init instanceof Array ? init : init ? [init] : [];
        var pos = 0;
        $.extend(this, {
            left: function() {
                if (pos === 0) {
                    pos = data.length - 1;
                } else {
                    --pos;
                }
                return data[pos];
            },
            right: function() {
                if (pos == data.length - 1) {
                    pos = 0;
                } else {
                    ++pos;
                }
                return data[pos];
            },
            current: function() {
                return data[pos];
            },
            data: function() {
                return data;
            },
            reset: function() {
                pos = 0;
            },
            append: function(item) {
                data.push(item);
                this.reset();
            }});
    }
    // -----------------------------------------------------------------------
    // :: STACK DATA STRUCTURE
    // -----------------------------------------------------------------------
    function Stack(init) {
        var data = init ? [init] : [];
        $.extend(this, {
            size: function() {
                return data.length;
            },
            pop: function() {
                if (data.length === 0) {
                    return null;
                } else {
                    var value = data[data.length - 1];
                    data = data.slice(0, data.length - 1);
                    return value;
                }
            },
            push: function(value) {
                data = data.concat([value]);
                return value;
            },
            top: function() {
                return data.length > 0 ? data[data.length - 1] : null;
            }});
    }
    // serialize object myself (biwascheme or prototype library do something
    // wiked with JSON serialization for Arrays)
    $.json_stringify = function(object, level) {
        var result = '';
        level = level === undefined ? 1 : level;
        var type = typeof object;
        switch (type) {
        case 'function':
            result += object;
            break;
        case 'boolean':
            result += object ? 'true' : 'false';
            break;
        case 'object':
            if (object === null) {
                result += 'null';
            } else if (object instanceof Array) {
                result += '[';
                var len = object.length;
                for (var i = 0; i < len - 1; ++i) {
                    result += $.json_stringify(object[i], level + 1);
                }
                result += $.json_stringify(object[len - 1], level + 1) + ']';
            } else {
                result += '{';
                for (var property in object) {
                    if (object.hasOwnProperty(property)) {
                        result += '"' + property + '":' +
                            $.json_stringify(object[property], level + 1);
                    }
                }
                result += '}';
            }
            break;
        case 'string':
            var str = object;
            var repl = {
                '\\\\': '\\\\',
                '"': '\\"',
                '/': '\\/',
                '\\n': '\\n',
                '\\r': '\\r',
                '\\t': '\\t'};
            for (var i in repl) {
                if (repl.hasOwnProperty(i)) {
                    str = str.replace(new RegExp(i, 'g'), repl[i]);
                }
            }
            result += '"' + str + '"';
            break;
        case 'number':
            result += String(object);
            break;
        }
        result += (level > 1 ? ',' : '');
        // quick hacks below
        if (level == 1) {
            // fix last comma
            result = result.replace(/,([\]}])/g, '$1');
        }
        // fix comma before array or object
        return result.replace(/([\[{]),/g, '$1');
    };
    // -----------------------------------------------------------------------
    // :: HISTORY CLASS
    // -----------------------------------------------------------------------
    function History(name) {
        var enabled = true;
        if (typeof name === 'string' && name !== '') {
            name += '_';
        }
        var data = $.Storage.get(name + 'commands');
        var bc = new BCycle(data ? eval('(' + data + ')') : ['']);

        $.extend(this, {
            append: function(item) {
                if (enabled && bc.current() != item) {
                    bc.append(item);
                    $.Storage.set(name + 'commands', $.json_stringify(bc.data()));
                }
            },
            data: function() {
                return bc.data();
            },
            next: function() {
                return bc.right();
            },
            last: function() {
                bc.reset();
            },
            previous: function() {
                return bc.left();
            },
            clear: function() {
                bc = new BCycle();
                $.Storage.remove(name + 'commands');
            },
            enable: function() {
                enabled = true;
            },
            disable: function() {
                enabled = false;
            }});
    }
    // -----------------------------------------------------------------------
    // :: COMMAND LINE PLUGIN
    // -----------------------------------------------------------------------
    $.fn.cmd = function(options) {
        var self = this;
        self.addClass('cmd');
        self.append('<span class="prompt"></span><span></span>' +
                    '<span class="cursor">&nbsp;</span><span></span>');

        var clip = $('<textarea/>').addClass('clipboard').appendTo(self);
        if (options.width) {
            self.width(options.width);
        }
        var num_chars; // calculates by draw_prompt
        var prompt_len;

        var mask = options.mask || false;
        var command = '';
        var position = 0;
        var prompt;
        var enabled = options.enabled;
        var name, history;
        
        var blink = (function() {
            var cursor = self.find('.cursor');
            return function(i) {
                cursor.toggleClass('inverted');
            };
        })();
        var cursor = self.find('.cursor');
        function change_num_chars() {
            var W = self.width();
            var w = cursor.innerWidth();
            num_chars = Math.floor(W / w);
        }
        
        function get_splited_command_line(string) {
            var first = string.substring(0, num_chars - prompt_len - 1);
            var rest = string.substring(num_chars - prompt_len - 1);
            return [first].concat(str_parts(rest, num_chars));
        }
        var redraw = (function(self) {
            var cursor = self.find('.cursor');
            var before = cursor.prev();
            var after = cursor.next();
            
            function draw_cursor_line(string, position) {
                if (position == string.length) {
                    before.html(encodeHTML(string));
                    cursor.html('&nbsp;');
                    after.html('');
                } else if (position === 0) {
                    before.html('');
                    //fix for tilda in IE
                    cursor.html(encodeHTML(string.slice(0, 1)));
                    //cursor.html(encodeHTML(string[0]));
                    after.html(encodeHTML(string.slice(1)));
                } else {
                    var before_str = encodeHTML(string.slice(0, position));
                    before.html(before_str);
                    //fix for tilda in IE
                    var c = string.slice(position, position + 1);
                    //cursor.html(string[position]));
                    cursor.html(c == ' ' ? '&nbsp;' : encodeHTML(c));
                    if (position == string.lenght - 1) {
                        after.html('');
                    } else {
                        after.html(encodeHTML(string.slice(position + 1)));
                    }
                }
            }
            function div(string) {
                return '<div>' + encodeHTML(string) + '</div>';
            }
            function lines_after(lines) {
                var last_ins = after;
                $.each(lines, function(i, line) {
                    last_ins = $(div(line)).insertAfter(last_ins);
                });
            }
            function lines_before(lines) {
                $.each(lines, function(i, line) {
                    before.before(div(line));
                });
            }
            var count = 0;
            return function() {
                var string = mask ? command.replace(/./g, '*') : command;
                self.find('div').remove();
                before.html('');
                // long line
                if (string.length > num_chars - prompt_len - 1) {
                    //cursor in first line
                    var array = get_splited_command_line(string);
                    var first_len = array[0].length;
                    if (position < first_len) {
                        draw_cursor_line(array[0], position);
                        lines_after(array.slice(1));
                    } else if (position == first_len) {
                        before.before(div(array[0]));
                        draw_cursor_line(array[1], 0);
                        lines_after(array.slice(2));
                        
                    } else {
                        var num_lines = array.length;
                        var offset = 0;
                        if (position < first_len) {
                            draw_cursor_line(array[0], position);
                            lines_after(array.slice(1));
                        } else if (position == first_len) {
                            before.before(div(array[0]));
                            draw_cursor_line(array[1], 0);
                            lines_after(array.slice(2));
                        } else {
                            var last = array.slice(-1)[0];
                            var from_last = string.length - position;
                            if (from_last <= last.length) {
                                lines_before(array.slice(0, -1));
                                var pos = last.length==from_last ? 0 : last.length-from_last;
                                draw_cursor_line(last, pos);
                            } else {
                                // in the middle
                                if (num_lines == 3) {
                                    before.before('<div>' + encodeHTML(array[0]) +
                                                  '</div>');
                                    draw_cursor_line(array[1], position-first_len-1);
                                    after.after('<div>' + encodeHTML(array[2]) +
                                                '</div>');
                                } else {
                                    // more lines cursor in the middle
                                    var line_index = Math.floor((position+prompt_len) / num_chars);
                                    var current = array[line_index];
                                    var sum = (function(array) {
                                        var sum = 0;
                                        for (var i=array.length; i--;) {
                                            sum += array[i].length;
                                        }
                                        return sum;
                                    })(array.slice(0, line_index));
                                    var pos = position-sum;
                                    // cursor on first character in line
                                    if (pos == num_chars) {
                                        pos = 0;
                                        current = array[++line_index];
                                    }
                                    var before_str = encodeHTML(current.slice(0, pos));
                                    draw_cursor_line(current, pos);
                                    lines_before(array.slice(0, line_index));
                                    lines_after(array.slice(line_index+1));
                                }
                            }
                        }
                    }
                } else {
                     if (string === '') {
                         before.html('');
                         cursor.html('&nbsp;');
                         after.html('');
                     } else {
                         draw_cursor_line(string, position);
                     }
                }
            };
        })(self);

        var draw_prompt = (function() {
            var prompt_node = self.find('.prompt');
            return function() {
                if (typeof prompt == 'string') {
                    prompt_len = prompt.length;
                    prompt_node.html(encodeHTML(prompt) + '&nbsp;');
                } else {
                    prompt(function(string) {
                        prompt_len = string.length;
                        prompt_node.html(encodeHTML(string) + '&nbsp;');
                    });
                }
                //change_num_chars();
            };
        })();
        // paste content to terminal using hidden textarea
        function paste() {
            clip.focus();
            //wait until Browser insert text to textarea
            self.oneTime(1, function() {
                self.insert(clip.val());
                clip.blur();
                clip.val('');
            });
        }
        function keydown_event(e) {
            //console.log('keydown ' + e.which);
            if (options.keydown && options.keydown(e) === false) {
                return false;
            }
            if (enabled) {
                var pos, len, result;
                if (e.keyCode == 13) {
                    if (history && command) {
                        history.append(command);
                    }
                    history.last();
                    var tmp = command;
                    self.set('');
                    if (typeof prompt == 'function') {
                        draw_prompt();
                    }
                    if (options.commands) {
                        options.commands(tmp);
                    }
                } else if (e.which == 32) { //space
                    self.insert(' ');
                } else if (e.which == 8) { //backspace
                    if (command !== '' && position > 0) {
                        command = command.slice(0, position - 1) +
                            command.slice(position, command.length);
                        --position;
                        redraw();
                    }
                } else if (e.which == 9 && !(e.ctrlKey || e.altKey)) { // TAB
                    self.insert('\t');
                } else if (e.which == 46 || (e.which == 68 && e.ctrlKey)) { 
                    //DELETE or CTRL+D
                    if (command !== '' && position < command.length) {
                        command = command.slice(0, position) +
                            command.slice(position + 1, command.length);
                        redraw();
                    }
                    return true;
                } else if (history && e.which == 38 ||
                           (e.which == 80 && e.ctrlKey)) {
                    //UP ARROW or CTRL+P
                    self.set(history.previous());
                } else if (history && e.which == 40 ||
                           (e.which == 78 && e.ctrlKey)) {
                    //DOWN ARROW or CTRL+N
                    self.set(history.next());
                } else if (e.which == 27) { //escape
                    self.set('');
                } else if (e.which == 37 ||
                           (e.which == 66 && e.ctrlKey)) {
                    //CTRL+LEFT ARROW or CTRL+B
                    if (e.ctrlKey && e.which != 66) {
                        len = position - 1;
                        pos = 0;
                        if (command[len] == ' ') {
                            --len;
                        }
                        for (var i = len; i > 0; --i) {
                            if (command[i] == ' ' &&
                                command[i + 1] != ' ') {
                                pos = i + 1;
                                break;
                            }
                        }
                        self.position(pos);
                    } else {
                        //LEFT ARROW or CTRL+B
                        if (position > 0) {
                            --position;
                            redraw();
                        }
                    }
                } else if (e.which == 39 ||
                           (e.which == 70 && e.ctrlKey)) {
                    //RIGHT ARROW OR CTRL+F
                    if (e.ctrlKey && e.which != 70) {
                        // jump to beginig or end of the word
                        if (command[position] == ' ') {
                            ++position;
                        }
                        var match = command.slice(position).match(/[^ ] {2,}| +[^ ]?/);
                        if (!match || match[0].match(/^ +$/)) {
                            position = command.length;
                        } else {
                            if (match[0][0] != ' ') {
                                position += match.index + 1;
                            } else {
                                position += match.index + match[0].length - 1;
                                if (match[0][match[0].length-1] != ' ') {
                                    --position;
                                }
                            }
                        }
                        redraw();
                    } else {
                        if (position < command.length) {
                            ++position;
                            redraw();
                        }
                    }
                } else if (e.which == 123) { //F12 - Allow Firebug
                    return true;
                } else if (e.which == 36) { //HOME
                    self.position(0);
                } else if (e.which == 35) {
                    //END
                    self.position(command.length);
                } else if (e.ctrlKey || e.metaKey) {
                    if (e.shiftKey) { // CTRL+SHIFT+??
                        if (e.which == 84) {
                            //CTRL+SHIFT+T open closed tab
                            return true;
                        }
                    } else if (e.altKey) { //ALT+CTRL+??
                        //return true;
                    } else {
                        //NOTE: in opera charCode is undefined
                        if (e.which == 65) {
                            //CTRL+A
                            self.position(0);
                        } else if (e.which == 69) {
                            //CTRL+E
                            self.position(command.length);
                        } else if (e.which == 88 || e.which == 67 ||
                                   e.which == 87 || e.which == 84) {
                            //CTRL+X CTRL+C CTRL+W CTRL+T
                            return true;
                        } else if (e.which == 86) {
                            //CTRL+V
                            paste();
                            return true;
                        } else if (e.which == 75) {
                            //CTRL+K
                            if (position === 0) {
                                self.set('');
                            } else if (position != command.length) {
                                self.set(command.slice(0, position));
                            }
                        } else if (e.which == 17) { //CTRL+TAB switch tab
                            return true;
                        }
                    }
                } else if (e.altKey) {
                    //if (e.which == 18) { // press ALT
                    if (e.which == 68) { //ALT+D
                        self.set(command.slice(0, position) +
                                 command.slice(position).replace(/[^ ]+ |[^ ]+$/, ''),
                                 true);
                    }
                } else {
                    return true;
                }
                return false;
            } /*else {
                if ((e.altKey && e.which == 68) || 
                    (e.ctrlKey && [65, 66, 68, 69, 80, 78, 70].has(e.which)) ||
                    // 68 == D
                    [35, 36, 37, 38, 39, 40].has(e.which)) {
                    return false;
                }
                
            } */
        }

        $.extend(self, {
            name: function(string) {
                if (string !== undefined) {
                    name = string;
                    history = new History(string);
                } else {
                    return name;
                }
            },
            history: function() {
                return history;
            },
            set: function(string, stay) {
                if (string !== undefined) {
                    command = string;
                    if (!stay) {
                        position = command.length;
                    }
                    redraw();
                }
            },
            insert: function(string, stay) {
                if (position == command.length) {
                    command += string;
                } else if (position === 0) {
                    command = string + command;
                } else {
                    command = command.slice(0, position) +
                        string + command.slice(position);
                }
                if (!stay) {
                    position += string.length;
                }
                redraw();
            },
            get: function() {
                return command;
            },
            commands: function(commands) {
                if (commands) {
                    options.commands = commands;
                } else {
                    return commands;
                }
            },
            destroy: function() {
                $(document.documentElement).unbind('.commandline');
                self.find('.prompt').remove();
            },
            prompt: function(user_prompt) {
                if (user_prompt === undefined) {
                    return prompt;
                } else {
                    if (typeof user_prompt == 'string' ||
                        typeof user_prompt == 'function') {
                        prompt = user_prompt;
                    } else {
                        throw 'prompt must be a function or string';
                    }
                    draw_prompt();
                }
            },
            position: function(n) {
                if (typeof n == 'number') {
                    position = n < 0 ? 0 : n > command.length ? command.length : n;
                    redraw();
                } else {
                    return position;
                }
            },
            resize: function(num) {
                if (num) {
                    num_chars = num;
                } else {
                    change_num_chars();
                }
                redraw();
            },
            enable: function() {
                if (!enabled) {
                    self.everyTime(500, 'blink', blink);
                    enabled = true;
                }
            },
            isenabled: function() {
                return enabled;
            },
            disable: function() {
                if (enabled) {
                    self.stopTime('blink', blink);
                    self.find('.cursor').removeClass('inverted');
                    enabled = false;
                }
            },
            mask: function(display) {
                if (typeof display == 'boolean') {
                    mask = display;
                    redraw();
                } else {
                    return mask;
                }
            }
        });
        
        // INIT
        self.name(options.name || '');
        prompt = options.prompt || '>';
        draw_prompt();
        if (options.enabled === undefined || options.enabled === true) {
            self.enable();
        }
        // Keystrokes
        $(document.documentElement).keypress(function(e) {
            var result;
            if (e.ctrlKey && e.which == 99) {
                return true;
            }
            if (options.keypress) {
                result = options.keypress(e);
            }
            if (result === undefined || result) {
                if (enabled) {
                    if ([38, 32, 13, 0, 8].has(e.which) &&
                        e.keyCode != 123 && // for F12 which == 0
                        //!(e.which == 40 && e.shiftKey ||
                        !(e.which == 38 && e.shiftKey)) {
                        return false;
                    } else if (!e.ctrlKey && !(e.altKey && e.which == 100)) {
                        self.insert(String.fromCharCode(e.which));
                        return false;
                    }
                }
            } else {
                return result;
            }
            if (e.which == 100 && e.ctrlKey) {
                return false;
            }
        }).keydown(keydown_event);
        // characters
        return self;
    };
    // -----------------------------------------------------------------------
    // JSON-RPC CALL
    // -----------------------------------------------------------------------
    var requests = [];
    
    $.jrpc = function(url, id, method, params, success, error) {
        var request = $.json_stringify({
           'jsonrpc': '2.0', 'method': method,
            'params': params, 'id': id});
        //terminals.front().echo(request);
        return $.ajax({
            url: url,
            data: request,
            /*success: function(response) {
            terminals.front().echo(JSON.stringify(response));
            success(response);
            },*/
            success: success,
            error: error,
            contentType: 'application/json',
            dataType: 'json',
            beforeSend: function(jqXHR, settings) {
                requests.push(jqXHR);
            },
            async: true,
            cache: false,
            //timeout: 1,
            type: 'POST'});
    };
    
    // -----------------------------------------------------------------------
    // :: TERMINAL PLUGIN CODE
    // -----------------------------------------------------------------------
    var version = '0.3.6';
    var copyright = 'Copyright (c) 2011 Jakub Jankiewicz <http://jcubic.pl>';
    var version_string = 'version ' + version;
    //regex is for placing version string aligned to the right
    var reg = new RegExp(" {" + version_string.length + "}$");
    var signatures = [
        ['jQuery Terminal', '(c) 2011 jcubic'],
        ['JQuery Terminal Emulator v. ' + version,
         copyright.replace(/ *<.*>/, '')],
        ['JQuery Terminal Emulator version ' + version_string,
         copyright],
        ['      _______                 ________                        __',
         '     / / _  /_ ____________ _/__  ___/______________  _____  / /',
         ' __ / / // / // / _  / _/ // / / / _  / _/     / /  \\/ / _ \\/ /',
         '/  / / // / // / ___/ // // / / / ___/ // / / / / /\\  / // / /__',
         '\\___/____ \\\\__/____/_/ \\__ / /_/____/_//_/ /_/ /_/  \\/\\__\\_\\___/',
         '         \\/          /____/                                   '.replace(reg, '') +
         version_string,
         copyright],
        ['      __ _____                     ________                              __',
         '     / // _  /__ __ _____ ___ __ _/__  ___/__ ___ ______ __ __  __ ___  / /',
         ' __ / // // // // // _  // _// // / / // _  // _//     // //  \\/ // _ \\/ /',
         '/  / // // // // // ___// / / // / / // ___// / / / / // // /\\  // // / /__',
         '\\___//____ \\\\___//____//_/ _\\_  / /_//____//_/ /_/ /_//_//_/ /_/ \\__\\_\\___/',
         '          \\/              /____/                                          '.replace(reg, '') +
         version_string,
         copyright]
    ];
    
    var terminals = new Cycle(); //list of terminals global in this scope
    //stor all ajax request to cancel them on CTR+D [NOT WORKING]
    var requests = [];
    $.fn.terminal = function(init_eval, options) {

        var self = this;
        var lines = [];
        var output;
        var terminal_id = (function() {
            return terminals.length();
        })();
        var num_chars; // numer of chars in line
        var settings = {
            name: null,
            prompt: '>',
            history: true,
            exit: true,
            clear: true,
            enabled: true,
            login: null,
            onInit: null,
            onExit: null,
            keypress: null,
            keydown: null
        };
        if (options) {
            if (options.width) {
                self.width(options.width);
            }
            if (options.height) {
                self.height(options.height);
            }
            $.extend(settings, options);
        }
        var pause = !settings.enabled;
        
        
        if (self.length === 0) {
            throw 'Sorry, but terminal said that "' + self.selector +
                '" is not valid selector';
        }
        if (self.data('terminal')) {
            self.ajaxSend(function(e, xhr, opt) {
                requests.push(xhr);
            });
            return self.data('terminal');
        }
        output = $('<div>').addClass('terminal-output').appendTo(self);
        self.addClass('terminal').append('<div/>');
        
        //calculate numbers of characters base on 
        function get_num_chars() {
            var test = $('<span>x</span>').appendTo(self);
            var result = Math.floor(self.width() / test.width());
            test.remove();
            return result;
        }
        
        // display Exception on terminal
        function display_exception(e, label) {
            if (typeof e == 'string') {
                self.error('&#91;' + label + '&#93;: ' + e)
            } else {
                //display filename and line which throw exeption
                self.error('&#91;' + label + '&#93;: ' + e.fileName + ': ' +
                           e.message);
                self.pause();
                $.get(e.fileName, function(file) {
                    self.resume();
                    var num = e.lineNumber - 1;
                    self.error('&#91;' + e.lineNumber + '&#93;: ' +
                               file.split('\n')[num]);
                });
            }
        }

        //validating if object is string or function, call that function and
        //display exeption if any
        function valid(label, object) {
            try {
                if (typeof object == 'function') {
                    object(function() {
                        // don't care
                    });
                } else if (typeof object != 'string') {
                    var msg = label + ' must be string or function';
                    throw msg;
                }
            } catch (e) {
                display_exception(e, label.toUpperCase());
                return false;
            }
            return true;
        }
        
        
        function scroll_to_bottom() {
            var scrollHeight = self.prop ? self.prop('scrollHeight') : 
                self.attr('scrollHeight');
            self.scrollTop(scrollHeight);
        }
        function draw_line(string) {
             var string = typeof string == 'string' ?
                string : String(string);
            var div;
            if (string.length > num_chars) {
                // string can have line break
                var array = string.split('\n');
                div = $('<div></div>');
                var len = array.length;
                for (var i = 0; i < len; ++i) {
                    if (array[i] === '' || array[i] == '\r') {
                        div.append('<div>&nbsp;</div>');
                    } else {
                        // if line is longer then width
                        if (array[i].length > num_chars) {
                            var parts = str_parts(array[i], num_chars);
                            $.each(parts, function(i, string) {
                                $('<div/>').html(encodeHTML(string)).
                                    appendTo(div);
                            });
                        } else {
                            $('<div/>').html(encodeHTML(array[i])).
                                appendTo(div);
                        }
                    }
                }
            } else {
                div = $('<div/>').html(encodeHTML(string));
            }
            output.append(div);
            div.width('100%');
            scroll_to_bottom();
            return div;
        }
        function show_greetings() {
            if (options.greetings === undefined) {
                self.echo(self.signature);
            } else if (options.greetings) {
                self.echo(options.greetings);
            }
        }
        function isScrolledIntoView(elem) {
            var docViewTop = $(window).scrollTop();
            var docViewBottom = docViewTop + $(window).height();
            
            var elemTop = $(elem).offset().top;
            var elemBottom = elemTop + $(elem).height();

            return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom));
        }

        // ----------------------------------------------------------
        // TERMINAL METHODS
        // ----------------------------------------------------------
        
        $.extend(self, {
            clear: function() {
                output.html('');
                command_line.set('');
                lines = [];
                self.attr({ scrollTop: 0});
                return self;
            },
            paused: function() {
                return pause;
            },
            pause: function() {
                if (command_line) {
                    self.disable();
                    command_line.hide();
                }
                return self;
            },
            resume: function() {
                //console.log('resume on ' + options.prompt + '\n' + 
                //            get_stack(arguments.callee.caller).join(''));
                if (command_line) {
                    self.enable();
                    command_line.show();
                    scroll_to_bottom();
                }
                return self;
            },
            cols: function() {
                return num_chars;
            },
            rows: function() {
                return lines.length;
            },
            history: function() {
                return command_line.history().data();
            },
            next: function() {
                if (terminals.length() == 1) {
                    return self;
                } else {
                    var offsetTop = self.offset().top;
                    var height = self.height();
                    var scrollTop = self.scrollTop();
                    if (!isScrolledIntoView(self)) {
                        self.enable();
                        $('html,body').animate({scrollTop: offsetTop-50}, 500);
                        return self;
                    } else {
                        terminals.front().disable();
                        var next = terminals.rotate().enable();
                        var x = next.offset().top - 50; // 100 provides buffer in viewport
                        $('html,body').animate({scrollTop: x}, 500);
                        return next;
                    }
                }
            },
            focus: function(toggle) {
                //console.log('focus on ' + options.prompt + '\n' + 
                //            get_stack(arguments.callee.caller).join(''));
                self.oneTime(1, function() {
                    if (terminals.length() == 1) {
                        if (toggle === false) {
                            self.disable();
                        } else {
                            self.enable();
                        }
                    } else {
                        if (toggle === false) {
                            self.next();
                        } else {
                            terminals.front().disable();
                            terminals.set(self);
                            self.enable();
                        }

                    }
                });
                return self;
            },
            enable: function() {
                //console.log('enable: ' + options.prompt + '\n' + 
                //            get_stack(arguments.callee.caller).join(''));
                if (num_chars === undefined) {
                    //enabling first time
                    self.resize();
                }
                if (pause) {
                    if (command_line) {
                        command_line.enable();
                        pause = false;
                    }
                }
                return self;
            },
            disable: function() {
                if (command_line) {
                    pause = true;
                    command_line.disable();
                }
                return self;
            },
            enabled: function() {
                return pause;
            },
            signature: function() {
                var cols = self.cols();
                var i = cols < 15 ? null : cols < 35 ? 0 : cols < 55 ? 1 : cols < 64 ? 2 : cols < 75 ? 3 : 4;
                if (i !== null) {
                    return signatures[i].join('\n') + '\n';
                } else {
                    return '';
                }
            },
            /* COMMAND LINE FUNCTIONS */
            get_command: function() {
                return command_line.get();
            },
            insert: function(string) {
                command_line.insert(string);
                return self;
            },
            set_prompt: function(prompt) {
                if (valid('prompt', prompt)) {
                    command_line.prompt(prompt);
                }
                return self;
            },
            set_command: function(command) {
                command_line.set(command);
                return self;
            },
            set_mask: function(display) {
                command_line.mask(display);
                return self;
            },
            get_output: function() {
                return $.map(lines, function(i, item) {
                    return typeof item == 'function' ? item() : item;
                }).get().join('\n');
            },
            resize: function(width, height) {
                if (width && height) {
                    self.width(width);
                    self.height(height);
                }
                num_chars = get_num_chars();
                command_line.resize(num_chars);
                var o = output.detach();
                output.html('');
                $.each(lines, function(i, line) {
                    draw_line(typeof line == 'function' ? line() : line);
                });
                self.prepend(o);
                scroll_to_bottom();
                return self;
            },
            echo: function(line) {
                lines.push(line);
                return draw_line(typeof line == 'function' ? line() : line);
            },
            error: function(message) {
                self.echo(message).addClass('error');
            },
            scroll: function(amount) {
                if (self.prop) {
                    if (amount > self.prop('scrollTop') && amount > 0) {
                        self.prop('scrollTop', 0);
                    }
                    var pos = self.prop('scrollTop');
                    self.prop('scrollTop', pos + amount);
                    return self;
                } else {
                    if (amount > self.attr('scrollTop') && amount > 0) {
                        self.attr('scrollTop', 0);
                    }
                    var pos = self.attr('scrollTop');
                    self.attr('scrollTop', pos + amount);
                    return self;
                }
            },
            logout: settings.login ? function() {
                while (interpreters.size() > 1) {
                    interpreters.pop();
                }
                logout();
                return self;
            } : function() {
                throw "You don't have login function";
            },
            token: settings.login ? function() {
                var name = settings.name;
                return $.Storage.get('token' + (name ? '_' + name : ''));
            } : null,
            login_name: settings.login ? function() {
                var name = settings.name;
                return $.Storage.get('login_' + (name ? '_' + name : ''));
            } : null,
            name: function() {
                return settings.name;
            },
            push: function(_eval, options) {
                if (!options.prompt || valid('prompt', options.prompt)) {
                    if (typeof _eval == 'string') {
                        var ueval = options['eval'];
                        _eval = make_json_rpc_eval_fun(ueval, self);
                    }
                    interpreters.push($.extend({'eval': _eval}, options));
                    /*
                        name: options.name,
                        'eval': _eval,
                        prompt: options.prompt,
                        login: options.login,
                        greetings: options.grettings,
                        onStart: options.onStart,
                        onExit: options.onExit});*/
                    prepare_top_interpreter();
                }
                return self;
            },
            pop: function(string) {
                if (string !== undefined) {
                    echo_command(string);
                }
                if (interpreters.top().name === settings.name) {
                    if (settings.login) {
                        logout();
                        if (typeof settings.onExit == 'function') {
                            settings.onExit(self);
                        }
                    }
                } else {
                    var current = interpreters.pop();
                    prepare_top_interpreter();
                    if (typeof current.onExit == 'function') {
                        current.onExit(self);
                    }
                }
                return self;
                
            }
        });
        
        //function constructor for eval
        function make_json_rpc_eval_fun(url, terminal) {
            var id = 1;
            var service = function(method, params) {
                terminal.pause();
                $.jrpc(url, id++, method, params, function(json) {
                    if (!json.error) {
                        if (typeof json.result == 'string') {
                            terminal.echo(json.result);
                        } else if (json.result instanceof Array) {
                            terminal.echo(json.result.join(' '));
                        } else if (typeof json.result == 'object') {
                            var string = '';
                            for (var f in json.result) {
                                if (json.result.hasOwnProperty(f)) {
                                    string += f + ': ' + json.result[f] + '\n';
                                }
                            }
                            terminal.echo(string);
                        }
                    } else {
                        terminal.error('&#91;RPC&#93; ' + json.error.message);
                    }
                    terminal.resume();
                }, function(xhr, status, error) {
                    terminal.error('&#91;AJAX&#93; ' + status +
                                   ' - Server reponse is: \n' +
                                   xhr.responseText);
                    terminal.resume();
                });
            };
            //this is eval function
            return function(command, terminal) {
                if (command === '') {
                    return;
                }
                var method, params;
                if (!command.match(/[^ ]* /)) {
                    method = command;
                    params = [];
                } else {
                    command = command.split(/ +/);
                    method = command[0];
                    params = command.slice(1);
                }
                if (!settings.login || method == 'help') {
                    service(method, params);
                } else {
                    var token = terminal.token();
                    if (token) {
                        service(method, [token].concat(params));
                    } else {
                        //should never happen
                        terminal.error('&#91;AUTH&#93; Access denied (no token)');
                    }
                }
            };
        }

        var url;
        switch(typeof init_eval) {
        case 'string':
            url = init_eval;
            // create json-rpc eval function
            init_eval = make_json_rpc_eval_fun(init_eval, self);
            break;
        case 'object':
            init_eval = (function(object) {
                // function that maps commands to object methods
                // it keeps terminal context
                return function(command, terminal) {
                    if (command == '') {
                        return;
                    }
                    command = command.split(/ */);
                    var method = command[0];
                    var params = command.slice(1);
                    var val = object[method];
                    if (typeof val == 'function') {
                        val.apply(self, params);
                    } else {
                        self.echo("Command '" + method + "' Not Found");
                    }
                        
                };
            })(init_eval);
            break;
        }
        
        // create json-rpc authentication function
        if (url && typeof settings.login == 'string' || url) {
            settings.login = (function(method) {
                var id = 1;
                return function(user, passwd, callback) {
                    self.pause();
                    $.jrpc(url,
                           id++,
                           method,
                           [user, passwd],
                           function(response) {
                               
                               self.resume();
                               if (!response.error && response.result) {
                                   callback(response.result);
                               } else {
                                   callback(null);
                               }
                           }, function(xhr, status, error) {
                               self.resume();
                               self.error('&#91;AJAX&#92; Response: ' +
                                          status + '\n' +
                                          xhr.responseText);
                           });
                };
                //default name is login so you can pass true
            })(typeof settings.login == 'boolean' ? 'login' : settings.login);
        }

        //display prompt and last command
        function echo_command(command) {
            var prompt = command_line.prompt();
            if (command_line.mask()) {
                command = command.replace(/./g, '*');
            }
            if (typeof prompt == 'function') {
                prompt(function(string) {
                    self.echo(string + ' ' + command);
                });
            } else {
                self.echo(prompt + ' ' +command);
            }
        }

        // wrapper over eval it implements exit and catch all exeptions
        // from user code and display them on terminal
        function commands(command) {
            try {
                var interpreter = interpreters.top();
                
                if (command == 'exit' && settings.exit) {
                    if (interpreters.size() == 1) {
                        if (settings.login) {
                            logout();
                        } else {
                            var msg = 'You can exit from main interpeter';
                            self.echo(msg);
                        }
                    } else {
                        self.pop('exit');
                    }
                } else {
                    echo_command(command);
                    if (command == 'clear' && settings.clear) {
                        self.clear();
                    } else {
                        interpreter['eval'](command, self);
                    }
                }
            
            } catch (e) {
                display_exception(e, 'USER');
                throw e;
            }
        }
        
        // functions change prompt of command line to login to password
        // and call user login function with callback that set token
        // if user call it with value that is true
        function login() {
            var user = null;
            command_line.prompt('login:');
            // don't stor logins in history
            if (settings.history) {
                command_line.history().disable();
            }
            command_line.commands(function(command) {
                try {
                    echo_command(command);
                    if (!user) {
                        user = command;
                        command_line.prompt('password:');
                        command_line.mask(true);
                    } else {
                        command_line.mask(false);
                        self.pause();
                        settings.login(user, command, function(user_data) {
                            if (user_data) {
                                var name = settings.name;
                                name = (name ? '_' + name : '');
                                $.Storage.set('token' + name, user_data);
                                $.Storage.set('login' + name, user);
                                //restore commands and run interpreter
                                command_line.commands(commands);
                                // move this to one function init.
                                initialize();
                            } else {
                                self.error('Wrong password try again');
                                command_line.prompt('login:');
                                user = null;
                            }
                            self.resume();
                            if (settings.history) {
                                command_line.history().enable();
                            }
                        });
                    }
                } catch (e) {
                    display_exception(e, 'LOGIN', self);
                    throw e;
                }
            });
        }

        //logout function remove Storage, disable history and run login function
        //this function is call only when options.login function is defined
        //check for this is in self.pop method
        function logout() {
            var name = settings.name;
            name = (name ? '_' + name : '');
            $.Storage.remove('token' + name, null);
            $.Storage.remove('login' + name, null);
            if (settings.history) {
                command_line.history().disable();
            }
            login();
        }


        //function enable history, set prompt, run eval function
        function prepare_top_interpreter() {
            var interpreter = interpreters.top();
            var name = '';
            if (interpreter.name !== undefined &&
                interpreter.name !== '') {
                name += interpreter.name + '_';
            }
            name += terminal_id;
            command_line.name(name);
            command_line.prompt(interpreter.prompt);
            if (settings.history) {
                command_line.history().enable();
            }
            command_line.set('');
            if (typeof interpreter.onStart == 'function') {
                interpreter.onStart(self);
            }
        }
        
        function initialize() {
            prepare_top_interpreter();
            show_greetings();
            if (typeof settings.onInit == 'function') {
                settings.onInit(self);
            }
        }
        
        function key_press(e) {
            if (settings.keypress && settings.keypress(e, self) === false) {
                return false;
            }
            //console.log(e.charCode + '|' + e.which);
            if (!self.paused()) {
                // CTRL+D
                if (e.which == 100 && e.ctrlKey) {
                    if (settings.exit && command_line.get() === '') {
                        if (interpreters.size() > 1 || settings.login !== undefined) {
                            self.pop('');
                        } else {
                            self.resume();
                            self.echo('');
                        }
                    }
                    return false;
                } else if (e.which == 118 && e.ctrlKey) { // CTRL+V
                    self.oneTime(1, function() {
                        scroll_to_bottom();
                    });
                    return true;
                } else if (e.keyCode == 9 && e.ctrlKey) { // TAB
                    self.focus(false);
                } else if (e.keyCode == 34) { // PAGE DOWN
                    self.scroll(self.height());
                } else if (e.keyCode == 33) { // PAGE UP
                    self.scroll(-self.height());
                } else {
                    self.attr({scrollTop: self.attr('scrollHeight')});
                }
            } else {
                //this is not working - Keypress is not call when there is ajax requests - ???
                if (e.which == 100 && e.ctrlKey) {
                    for (var i=requests.length; i--;) {
                        var r = requests[i];
                        if (4 != r.readyState) {
                            try {
                                r.abort();
                            } catch(e) {
                                self.error('error in aborting ajax');
                            }
                        }
                    }
                    self.resume();
                    return false;
                }
            }
        }
        // INIT CODE
        if (valid('prompt', settings.prompt)) {
            var interpreters = new Stack({'name': settings.name,
                                          'eval': init_eval,
                                          'prompt': settings.prompt,
                                          'greetings': settings.greetings});

            var command_line = self.find('.terminal-output').next().cmd({
                prompt: settings.prompt,
                history: settings.history,
                width: '100%',
                keydown: settings.keydown ? function(e) {
                    return settings.keydown(e, self);
                } : null,
                keypress: key_press,
                commands: commands
            });
            self.livequery(function() {
                self.resize();
            });
            //self.resize();
            //num_chars = get_num_chars();
            terminals.append(self);
            //console.log(settings);
            if (settings.enabled === true) {
                self.focus();
            } else {
                //console.log('disable ' + settings.prompt);
                self.disable();
            }
            $(window).resize(self.resize);
            self.click(function() {
                self.focus();
            });
            if (self.token && !self.token() && self.login_name &&
                !self.login_name()) {
                login();
            } else {
                initialize();
            }
            if (typeof $.fn.init.prototype.mousewheel === 'function') {
                self.mousewheel(function(event, delta) {
                    //self.echo(dir(event));
                    if (delta > 0) {
                        self.scroll(-40);
                    } else {
                        self.scroll(40);
                    }
                    return false;
                }, true);
            }
        }
        self.data('terminal', self);
        return self;

    }; //terminal plugin

})(jQuery);
