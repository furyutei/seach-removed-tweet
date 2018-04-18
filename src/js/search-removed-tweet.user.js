// ==UserScript==
// @name            search-removed-tweet
// @namespace       https://furyu.hatenablog.com/
// @version         0.0.1.1
// @description     If the tweet is deleted or private, the Google search page for that tweet will open.
// @author          furyu
// @include         *
// @grant           GM_xmlhttpRequest
// @grant           GM.xmlHttpRequest
// @connect         twitter.com
// @connect         google.co.jp
// @require         https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require         https://furyutei.github.io/jsTwitterOAuth/src/js/twitter-oauth/jQuery.setAjaxTransport_GM_xmlhttpRequest.js?v=0.1.4
// ==/UserScript==

/*
Required
--------
- [jQuery](https://jquery.com/)
    The MIT License
    [License | jQuery Foundation](https://jquery.org/license/)

- [jQuery.setAjaxTransport_GM_xmlhttpRequest.js](https://github.com/furyutei/jsTwitterOAuth/blob/master/src/js/twitter-oauth/jQuery.setAjaxTransport_GM_xmlhttpRequest.js)
    [The MIT License](https://github.com/furyutei/jsTwitterOAuth/blob/master/LICENSE)
*/

/*
The MIT License (MIT)

Copyright (c) 2018 furyu <furyutei@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

( function () {

'use strict';

var SCRIPT_NAME = 'search-removed-tweet',
    AUTO_REDIRECT_FROM_404_PAGE = false,
    IS_TOUCHED = ( function () {
        var touched_id = SCRIPT_NAME + '_touched',
            jq_touched = $( '#' + touched_id );
        
        if ( 0 < jq_touched.length ) {
            return true;
        }
        
        $( '<b>' ).attr( 'id', touched_id ).css( 'display', 'none' ).appendTo( $( document.documentElement ) );
        
        return false;
    } )();

if ( IS_TOUCHED ) {
    console.error( SCRIPT_NAME + ': Already loaded.' );
    return;
}


$.setAjaxTransport_GM_xmlhttpRequest();


function get_absolute_url( path, base_url ) {
    if ( ! base_url ) {
        base_url = location.href;
    }
    
    try {
        return new URL( path, base_url ).href;
    }
    catch ( error ) {
        return path;
    }
} // end of get_absolute_url()


var set_click_event = ( function () {
    var click_event_name = 'click.' + SCRIPT_NAME,
        data_touched_name = 'data-' + SCRIPT_NAME + '-touched',
        data_originla_url_name = 'data-' + SCRIPT_NAME + '-original-url',
        
        reg_tweet_url = /^https?:\/\/twitter\.com\/([^\/]+)\/status(?:es)?\/(\d+)(?:\/|\?|$)/,
        reg_protected_tweet = /^https?:\/\/twitter\.com\/.*?[?&]protected_redirect=true/,
        //reg_exclude_url = /^https?:\/\/(?:[^\/.]+\.)?google\.[a-z.]+(?:\/|\?|$)/,
        reg_twitter_official_url = /^https?:\/\/(?:[^\/.]+\.)?twitter\.com(?:\/|\?|$)/,
        
        search_url_base = 'https://www.google.co.jp/search?ie=UTF-8&q=',
        searh_form_url = 'https://www.google.co.jp/',
        
        click_event_key = [ 'altKey', 'button', 'buttons', 'clientX', 'clientY', 'ctrlKey', 'metaKey', 'movementX', 'movementY', 'offsetX', 'offsetY', 'pageX', 'pageY', 'region', 'relatedTarget', 'screenX', 'screenY', 'shiftKey', 'which', 'x', 'y' ],
        
        get_tweet_info_from_url = function ( url ) {
            if ( ! url ) {
                url = location.href;
            }
            
            if ( ! url.match( reg_tweet_url ) ) {
                return null;
            }
            
            var screen_name = RegExp.$1,
                tweet_id = RegExp.$2;
            
            return {
                screen_name : screen_name,
                tweet_id : tweet_id
            };
        },
        
        get_simple_search_url = function ( tweet_id ) {
            return search_url_base + encodeURIComponent( 'inurl:' + tweet_id );
        },
        
        $get_search_url = ( function () {
            var max_wait_time_before_search = 1000,
                last_search_form_acquired_time = 0,
                
                $search_form = null,
                
                $update_search_form = function () {
                    var $deferred = $.Deferred(),
                        $promise = $deferred.promise();
                    
                    $.ajax( {
                        url : searh_form_url,
                        method : 'GET'
                    } )
                    .done( function ( html, textStatus, jqXHR ) {
                        var $form = $( html ).find( 'form#tsf' );
                        
                        if ( 0 < $form.length ) {
                            $form.attr( 'action', get_absolute_url( $form.attr( 'action' ), jqXHR.responseURL ) );
                            last_search_form_acquired_time = new Date().getTime();
                            $search_form = $form;
                            $deferred.resolve( $form );
                        }
                        else {
                            console.error( '$update_search_form.reject(): search form not found', html, jqXHR, textStatus );
                            $search_form = null;
                            $deferred.reject();
                        }
                    } )
                    .fail( function ( jqXHR, textStatus, errorThrown ) {
                        console.error( '$update_search_form.reject(): $.ajax().fail()', jqXHR, textStatus );
                        $search_form = null;
                        $deferred.reject();
                    } );
                    
                    return $promise;
                },
                
                $promise_update_search_form = $update_search_form(),
                
                get_search_url_from_form = function ( tweet_id, $form ) {
                    if ( ! $form ) {
                        $form = $search_form;
                    }
                    if ( ( ! $form ) || ( $form.length <= 0 ) ) {
                        return get_simple_search_url( tweet_id );
                    }
                    
                    var $query = $form.find( 'input[name="q"]' ).val( 'inurl:' + tweet_id ),
                        $submit = $form.find( 'input[name="btnK"]' ),
                        action_url = $form.attr( 'action' );
                    
                    return action_url + '?' + $form.serialize();
                },
                
                $wait_before_search = function () {
                    // Delay 1000 ms after acquiring the search form and before actual searching to avoid  "I’m Not A Robot reCAPTCHA"
                    var $deferred = $.Deferred(),
                        $promise = $deferred.promise(),
                        current_time = new Date().getTime(),
                        wait_time = last_search_form_acquired_time + max_wait_time_before_search - current_time;
                    
                    if ( wait_time <= 0 ) {
                        $deferred.resolve();
                        return $promise;
                    }
                    
                    setTimeout( function () {
                        $deferred.resolve();
                    }, wait_time );
                    
                    return $promise;
                };
            
            return function ( tweet_id ) {
                var $deferred = $.Deferred(),
                    $promise = $deferred.promise();
                
                $promise_update_search_form
                .done( function () {
                    $wait_before_search()
                    .done( function () {
                        var search_url = get_search_url_from_form( tweet_id );
                        
                        $promise_update_search_form = $update_search_form();
                        
                        $deferred.resolve( search_url );
                    } );
                } )
                .fail( function () {
                    var search_url = get_simple_search_url( tweet_id );
                    
                    $promise_update_search_form = $update_search_form();
                    
                    $deferred.resolve( search_url );
                } );
                
                return $promise;
            };
        } )();
    
    return function ( root_element ) {
        //if ( reg_exclude_url.test( location.href ) ) {
        //    return;
        //}
        
        if ( reg_twitter_official_url.test( location.href ) ) {
            if ( window.name.indexOf( SCRIPT_NAME + '.' ) == 0 ) {
                if ( reg_protected_tweet.test( location.href ) || ( 0 < $( 'form.search-404' ).length ) ) {
                    $( document.body || document.documentElement ).hide();
                }
                try {
                    window.name = '';
                }
                catch ( error ) {
                }
                return;
            }
            
            var tweet_info = get_tweet_info_from_url( location.href );
            
            if ( ! tweet_info ) {
                return;
            }
            
            if ( $( 'form.search-404' ).length <= 0 ) {
                return;
            }
            
            $get_search_url( tweet_info.tweet_id )
            .done( function ( search_url ) {
                if ( AUTO_REDIRECT_FROM_404_PAGE ) {
                    location.replace( search_url );
                }
                else {
                    window.open( search_url, '_blank' );
                }
            } );
            
            return;
        }
        
        if ( ! root_element ) {
            root_element = document.body || document.documentElement;
        }
        
        $( root_element ).on( click_event_name, function ( $event ) {
            var $target = $( $event.target );
            
            if ( ( ! $target.is( 'a' ) ) || ( $target.attr( data_touched_name ) === 'true' ) ) {
                return;
            }
            
            $target.attr( data_touched_name, 'true' );
            
            var link_url = get_absolute_url( $target.attr( 'href' ) );
            
            if ( ! link_url ) {
                return;
            }
            
            var tweet_info = get_tweet_info_from_url( link_url );
            
            if ( ! tweet_info ) {
                return;
            }
            
            var click_parameters = ( function () {
                    var original_event = $event.originalEvent,
                        click_parameters = {};
                    
                    click_event_key.forEach( function ( key ) {
                        if ( typeof original_event[ key ] != 'undefined' ) {
                            click_parameters[ key ] = original_event[ key ];
                        }
                    } );
                    
                    return click_parameters;
                } )(),
                
                target_url = $target.attr( 'href' ),
                target_window_name = SCRIPT_NAME + '.' + new Date().getTime(),
                target_window = window.open( target_url, target_window_name ),
                
                click_link = function () {
                    var event = new MouseEvent( 'click', click_parameters ),
                        new_url = $target.attr( 'href' );
                    
                    $target.trigger( 'click', click_parameters ); // TODO: target page does not open
                    
                    //$target.get( 0 ).dispatchEvent( event ); // TODO: pop-up blocked
                    
                    if ( target_url != new_url ) {
                        target_window.location.replace( new_url );
                    }
                },
                
                do_search = function ( link_title, link_text ) {
                    $get_search_url( tweet_info.tweet_id )
                    .done( function ( search_url ) {
                        var $orig_link = $target.clone( false ).empty().text( '\u00a0' + link_text + '\u00a0' ).attr( 'title', link_title ).css( {
                                'display' : 'inline-block',
                                'font-size' : '14px',
                                'color' : 'red',
                                'background' : 'white',
                                'text-decoration' : 'none',
                            } );
                        
                        $target
                        .attr( {
                            [ data_originla_url_name ] : link_url,
                            'href' : search_url
                        } )
                        .before( $orig_link );
                        
                        click_link();
                    } );
                };
            
            $event.stopPropagation();
            $event.preventDefault();
            
            $.ajax( {
                url : link_url,
                method : 'HEAD'
            } )
            .done( function ( data, textStatus, jqXHR ) {
                if ( ( ! jqXHR.responseURL ) || ( ! reg_protected_tweet.test( jqXHR.responseURL ) ) ) {
                    click_link();
                    return;
                }
                
                do_search( 'Protected Tweet', '\u26D4' );
            } )
            .fail( function ( jqXHR, textStatus, errorThrown ) {
                if ( jqXHR.status != 404 ) {
                    click_link();
                    return;
                }
                
                do_search( 'Tweet has been removed (404: Not Found)', '\u26a0' );
            } );
        } );
    };
} )(); // end of set_click_event()


function main() {
    set_click_event();
} // end of main()


main();

} )();

// end of search-removed-tweet
