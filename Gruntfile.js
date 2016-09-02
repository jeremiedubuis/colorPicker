module.exports = function(grunt){

    grunt.initConfig({
        jshint: {

            options: {
                expr: true,
                globals: {
                    jQuery: true
                }
            },
            files: {
                src: ['ColorPicker.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.registerTask('default', ['jshint']);

};
