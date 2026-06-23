package main

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"math"
	"time"
)

const (
	SampleRate = 44100
	ChordDuration = 120 // ms
)

var Frequencies = []float64{
	130.81, // C3 (Sunday)
	155.56, // Eb3 (Monday)
	174.61, // F3 (Tuesday)
	196.00, // G3 (Wednesday)
	233.08, // Bb3 (Thursday)
	261.63, // C4 (Friday)
	311.13, // Eb4 (Saturday)
}

func GenerateAndPlayMusic(contributions []Contribution) (string, error) {
	// Take the last 364 days to match the 52x7 grid
	if len(contributions) > 364 {
		contributions = contributions[len(contributions)-364:]
	} else if len(contributions) < 364 {
		pad := make([]Contribution, 364-len(contributions))
		contributions = append(pad, contributions...)
	}

	var audioData []float64
	samplesPerChord := int(float64(SampleRate) * float64(ChordDuration) / 1000.0)

	// Process week by week
	for w := 0; w < 52; w++ {
		weekData := make([]float64, samplesPerChord)
		
		for d := 0; d < 7; d++ {
			idx := w*7 + d
			if idx >= len(contributions) {
				break
			}
			c := contributions[idx]
			if c.Count == 0 {
				continue
			}

			weekday := d
			if c.Date != "" {
				t, err := time.Parse("2006-01-02", c.Date)
				if err == nil {
					weekday = int(t.Weekday())
				}
			}

			freq := Frequencies[weekday%7]
			vol := 0.0
			durMs := 0.0

			if c.Count >= 1 && c.Count <= 3 {
				vol = 0.5
				durMs = 100.0
			} else if c.Count >= 4 && c.Count <= 9 {
				vol = 0.8
				durMs = 80.0
			} else if c.Count >= 10 {
				vol = 1.2
				durMs = 60.0
			}

			noteSamples := generateNote(freq, vol, durMs)
			for i := 0; i < len(noteSamples) && i < samplesPerChord; i++ {
				weekData[i] += noteSamples[i]
			}
		}

		audioData = append(audioData, weekData...)
	}

	return generateWAVBase64(audioData)
}

func generateNote(freq, vol, durMs float64) []float64 {
	samples := int(float64(SampleRate) * durMs / 1000.0)
	out := make([]float64, samples)
	
	attack := 0.010
	decay := 0.020
	sustain := 0.7
	release := 0.030
	dur := durMs / 1000.0

	for i := 0; i < samples; i++ {
		t := float64(i) / float64(SampleRate)
		
		env := 0.0
		if t < attack {
			env = t / attack
		} else if t < attack+decay {
			env = 1.0 - (1.0-sustain)*(t-attack)/decay
		} else if t < dur-release {
			env = sustain
		} else if t < dur {
			env = sustain * (dur - t) / release
		}

		if env < 0 {
			env = 0
		}

		sample := math.Sin(2.0*math.Pi*freq*t) * vol * env
		out[i] = sample
	}
	return out
}

func generateWAVBase64(data []float64) (string, error) {
	buf := new(bytes.Buffer)

	var numChannels uint16 = 1
	var sampleRate uint32 = SampleRate
	var bitsPerSample uint16 = 16
	var byteRate uint32 = sampleRate * uint32(numChannels) * uint32(bitsPerSample/8)
	var blockAlign uint16 = numChannels * (bitsPerSample / 8)
	
	dataSize := uint32(len(data) * int(bitsPerSample/8))
	chunkSize := 36 + dataSize

	buf.WriteString("RIFF")
	binary.Write(buf, binary.LittleEndian, chunkSize)
	buf.WriteString("WAVE")
	buf.WriteString("fmt ")
	binary.Write(buf, binary.LittleEndian, uint32(16))
	binary.Write(buf, binary.LittleEndian, uint16(1))
	binary.Write(buf, binary.LittleEndian, numChannels)
	binary.Write(buf, binary.LittleEndian, sampleRate)
	binary.Write(buf, binary.LittleEndian, byteRate)
	binary.Write(buf, binary.LittleEndian, blockAlign)
	binary.Write(buf, binary.LittleEndian, bitsPerSample)
	buf.WriteString("data")
	binary.Write(buf, binary.LittleEndian, dataSize)

	for _, sample := range data {
		// Apply soft clipping and gain boost
		sample = math.Tanh(sample * 2.5)
		
		val := int16(sample * 32767)
		binary.Write(buf, binary.LittleEndian, val)
	}

	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}
