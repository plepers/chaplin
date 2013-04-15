

SEPARATOR = '/';
PARAM_SEP = '?';

module.exports = class Path

    # @path     : String - fragment to parse
    # @params     : Object - get params

    path = null
    params = null

    constructor: (path, params) ->
        @solve( path )

        @params = params ? {}

    solve: ( path ) ->
        [@path, @params] = path.split PARAM_SEP
        i=0
        l = @path.length
        while @path[i] is SEPARATOR and i < l
            i++
        l--
        j=l
        while @path[j] is SEPARATOR and j > -1
            j--
        if i > 0 and j isnt l
            @path = @path[ i..j ]

        
