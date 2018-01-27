var async = require('async');
var fs = require('fs');
var path = require('path');

// File paths
var AFINN_PATH = path.resolve(__dirname, 'AFINN-en-165.txt');
var EMOJI_PATH = path.resolve(__dirname, 'Emoji_Sentiment_Data_v1.0.csv');
var RESULT_PATH = path.resolve(__dirname, 'build.json');
var SENTIWS_NEG_PATH = path.resolve(__dirname, 'SentiWS_v1.8c_Negative.txt');
var SENTIWS_POS_PATH = path.resolve(__dirname, 'SentiWS_v1.8c_Positive.txt');

/**
 * Read emoji data from original format (CSV).
 * @param  {object}   hash     Result hash
 * @param  {Function} callback Callback
 * @return {void}
 */
function processEmoji(hash, callback) {
    // Read file
    fs.readFile(EMOJI_PATH, 'utf8', function (err, data) {
        if (err) return callback(err);

        // Split data by new line
        data = data.split(/\n/);

        // Iterate over dataset and add to hash
        for (var i in data) {
            var line = data[i].split(',');

            // Validate line
            if (i == 0) continue;               // Label
            if (line.length !== 9) continue;    // Invalid

            // Establish sentiment value
            var emoji = String.fromCodePoint(line[1]);
            var occurences = line[2];
            var negCount = line[4];
            var posCount = line[6];
            var score = (posCount / occurences) - (negCount / occurences);
            var sentiment = Math.floor(5 * score);

            // Validate score
            if (Number.isNaN(sentiment)) continue;
            if (sentiment === 0) continue;

            // Add to hash
            hash[emoji] = sentiment;
        }

        callback(null, hash);
    });
}

/**
 * Read AFINN data from original format (TSV).
 * @param  {object}   hash     Result hash
 * @param  {Function} callback Callback
 * @return {void}
 */
function processAFINN(hash, callback) {
    // Read file
    fs.readFile(AFINN_PATH, 'utf8', function (err, data) {
        if (err) return callback(err);

        // Split data by new line
        data = data.split(/\n/);

        // Iterate over dataset and add to hash
        for (var i in data) {
            var line = data[i].split(/\t/);

            // Validate line
            if (line[0] === '') continue;

            // Add to hash
            hash[line[0]] = Number(line[1]);
        }

        callback(null, hash);
    });
}

function processSentiWSData(data, hash) {
    // Split data by new line
    data = data.split(/\n/);

    // Iterate over dataset and add to hash
    for (var i in data) {
        var line = data[i].split('\t');

        // Validate line
        if (i == 0) continue;               // Label
        if (line.length !== 3) continue;    // Invalid

        // Establish sentiment value
        //Abmachung|NN	0.0040	Abmachungen
        //collect words
        var words = line[2].split(',');
        words.push(line[0].split('|')[0]);
        var score = parseFloat(line[1]);
        var sentiment = Math.floor(5 * score);

        // Validate score
        if (Number.isNaN(sentiment)) continue;
        if (sentiment === 0) continue;

        // Add to hash
        words.forEach(function (word, idx, arr) {
            hash[word] = sentiment;
        });
    }
}
/**
 * Read sentiws data from original format (CSV).
 * @param  {object}   hash     Result hash
 * @param  {Function} callback Callback
 * @return {void}
 */
function processSentiWS(hash, callback) {
    fs.readFile(SENTIWS_POS_PATH, 'utf8', function (err, data) {
        if (err) return callback(err);
        processSentiWSData(data, hash);
        fs.readFile(SENTIWS_NEG_PATH, 'utf8', function (err, data) {
            if (err) return callback(err);
            processSentiWSData(data, hash);
            callback(null, hash);
        });
    });
}

/**
 * Write sentiment score hash to disk.
 * @param  {object}   hash     Result hash
 * @param  {Function} callback Callback
 * @return {void}
 */
function finish(hash, callback) {
    var result = JSON.stringify(hash, null, 4);
    fs.writeFile(RESULT_PATH, result, function (err) {
        if (err) return callback(err);
        callback(null, hash);
    });
}

// Execute build process
async.waterfall([
    function (cb) {
        cb(null, {});
    },
    processEmoji,
    processAFINN,
    processSentiWS,
    finish
], function (err, result) {
    if (err) throw new Error(err);
    process.stderr.write(
        'Complete: ' +
        Object.keys(result).length +
        ' entries.\n'
    );
});
