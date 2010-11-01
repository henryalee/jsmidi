var MIDI = new function() {}
Midi.translateTickTime = function(value) {
    var buffer = value & 0x7F;

    while (value >>= 7) {
        buffer <<= 8;
        buffer |= ((value & 0x7F) | 0x80);
    }

    var blist = [];
    while (true) {
        blist.push(buffer & 0xff)

        if (buffer & 0x80) buffer >>= 8;
        else break;
    }
    return blist;
}

MIDI.HDR_CHUNKID     = "\x4D\x54\x68\x64"; // First 4 bytes of a SMF Midi file
MIDI.prototype = { }
MIDI.HDR_CHUNK_SIZE  = "\x00\x00\x00\x06"; // Header size for SMF
MIDI.HDR_TYPE0       = "\x00\x00"; // Midi Type 0 id
MIDI.HDR_TYPE1       = "\x00\x01"; // Midi Type 1 id

MIDI.HDR_16TH        = "\x0020";
MIDI.HDR_EIGHT       = "\x0040";
MIDI.HDR_QUARTER     = "\x0080";
MIDI.HDR_DOUBLE      = "\x0100";
MIDI.HDR_WHOLE       = "\x0200";

MIDI.TRACK_START    = "\x4D\x54\x72\x6B"; // Marks the start of the track data
MIDI.TRACK_END      = "\x00\xFF\x2F\x00";

var MidiEvent = function(params) {
    this.timeStamp  = []; // Time stamp byte

    if (params) {
        this.setType(params.type);
        this.setChannel(params.channel);
        this.setParam1(params.param1);
        this.setParam2(params.param2);
    }
}

MidiEvent.EVT_NOTE_OFF           = 0x8;
MidiEvent.EVT_NOTE_ON            = 0x9;
MidiEvent.EVT_AFTER_TOUCH        = 0xA;
MidiEvent.EVT_CONTROLLER         = 0xB;
MidiEvent.EVT_PROGRAM_CHANGE     = 0xC;
MidiEvent.EVT_CHANNEL_AFTERTOUCH = 0xD;
MidiEvent.EVT_PITCH_BEND         = 0xE;
/**
 * Returns the list of events that form a note in MIDI. If the |sustained|
 * parameter is not specified, it creates the noteOff event, which stops the
 * note after it has been played, instead of keeping it playing.
 *
 * @param note {Note} Note object
 * @param sustained {Boolean} Whether the note has to end or keep playing
 * @returns Array of events, with a maximum of two events (noteOn and noteOff)
 */

MidiEvent.createNote = function(note, sustained) {
    var events = [];

    events.push(new MidiEvent({
        time:    this.setTime(time),
        type:    EVT_NOTE_ON,
        channel: note.channel || 0,
        param1:  note.pitch,
        param2:  note.volume
    }));

    if (!sustained) {
        events.push(new MidiEvent({
            time:    this.setTime(time),
            type:    EVT_NOTE_OFF,
            channel: note.channel || 0,
            param1:  note.pitch,
            param2:  note.volume
        }));
    }

    return events;
};

MidiEvent.prototype = {
    setTime: function(ticks) {
        // if the last byte is 0, a new 0 is inserted after it since
        // we need to have 2 nibbles for every time unit (eg. 81 00 -> 129
        // ticks).

        // The 0x00 byte is always the last one. This is how Midi
        // interpreters know that the time measure specification ends and the
        // rest of the event signature starts.

        this.time = Midi.translateTickTime(ticks);
        if (this.time[this.time.length-1] === 0) {
            this.time.push(0);
        }
    },
    setType: function(type) {
        if (type < MidiEvent.EVT_NOTE_OFF || type > MidiEvent.EVT_PITCH_BEND)
            throw new Error("Trying to set an unknown event: " + type);

        this.type = type;
    },
    setChannel: function(channel) {
        if (channel < 0 || channel > 15)
            throw new Error("Channel is out of bounds.");

        this.channel = channel;
    },
    setParam1: function(p) {
        this.param1 = p;
    },
    setParam2: function(p) {
        this.param2 = p;
    },

}


var MidiTrack = function() {
    this.eventList = [];
}

MidiTrack.prototype = {
    header: MIDI.TRACK_START,
    closed: false,

    addEvent: function(event) {
        this.eventList.push(event);
    },
    addEvents: function(events) {
        this.addEvent.apply(this, events);
    }
}

