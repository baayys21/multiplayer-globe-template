import "./styles.css";

import React, { useEffect, useRef, useState, LegacyRef } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";

// Tambahan: Tipe data pesawat dari OpenSky
interface Plane {
  icao24: string;
  callsign: string;
  origin_country: string;
  time_position: number;
  last_contact: number;
  longitude: number;
  latitude: number;
  baro_altitude: number;
  on_ground: boolean;
  velocity: number;
  true_track: number;
  vertical_rate: number;
  sensors: any;
  geo_altitude: number;
  squawk: string;
  spi: boolean;
  position_source: number;
}

function App() {
  // A reference to the canvas element where we'll render the globe
  const canvasRef = useRef<HTMLCanvasElement>();
  // The number of markers we're currently displaying
  const [counter, setCounter] = useState(0);
  // A map of marker IDs to their positions
  // Note that we use a ref because the globe's `onRender` callback
  // is called on every animation frame, and we don't want to re-render
  // the component on every frame.
  const positions = useRef<
    Map<
      string,
      {
        location: [number, number];
        size: number;
      }
    >
  >(new Map());
  // Connect to the PartyServer server
  const socket = usePartySocket({
    room: "default",
    party: "globe",
    onMessage(evt: MessageEvent) {
      const message = JSON.parse(evt.data as string) as OutgoingMessage;
      if (message.type === "add-marker") {
        // Add the marker to our map
        positions.current.set(message.position.id, {
          location: [message.position.lat, message.position.lng],
          size: message.position.id === socket.id ? 0.1 : 0.05,
        });
        // Update the counter
        setCounter((c: number) => c + 1);
      } else {
        // Remove the marker from our map
        positions.current.delete(message.id);
        // Update the counter
        setCounter((c: number) => c - 1);
      }
    },
  });
  // Tambahan: State untuk traffic pesawat
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [flightLines, setFlightLines] = useState<
    {
      from: [number, number];
      to: [number, number];
      id: string;
    }[]
  >([]);

  // Fetch data pesawat dari OpenSky API
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const fetchPlanes = async () => {
      try {
        const res = await fetch("https://opensky-network.org/api/states/all");
        const data = await res.json();
        if (data && data.states) {
          // Ambil 20 pesawat acak untuk visualisasi
          const randomPlanes = data.states
            .filter((p: any[]) => p[5] && p[6]) // pastikan ada lat/lon
            .slice(0, 20)
            .map((p: any[]) => ({
              icao24: p[0],
              callsign: p[1],
              origin_country: p[2],
              time_position: p[3],
              last_contact: p[4],
              longitude: p[5],
              latitude: p[6],
              baro_altitude: p[7],
              on_ground: p[8],
              velocity: p[9],
              true_track: p[10],
              vertical_rate: p[11],
              sensors: p[12],
              geo_altitude: p[13],
              squawk: p[14],
              spi: p[15],
              position_source: p[16],
            }));
          setPlanes(randomPlanes);
          // Buat garis lintasan antar pesawat (dari posisi sebelumnya ke posisi sekarang)
          const lines = randomPlanes.map((plane: Plane) => {
            // Simulasikan asal (from) sebagai posisi mundur sedikit dari posisi sekarang
            const rad = (plane.true_track || 0) * (Math.PI / 180);
            const dist = 2; // derajat, simulasi
            const fromLat = plane.latitude - Math.cos(rad) * dist;
            const fromLon = plane.longitude - Math.sin(rad) * dist;
            return {
              from: [fromLat, fromLon] as [number, number],
              to: [plane.latitude, plane.longitude] as [number, number],
              id: plane.icao24,
            };
          });
          setFlightLines(lines);
        }
      } catch (e) {
        // Gagal fetch, abaikan
      }
    };
    fetchPlanes();
    interval = setInterval(fetchPlanes, 20000); // update tiap 20 detik
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // The angle of rotation of the globe
    // We'll update this on every frame to make the globe spin
    let phi = 0;

    const globe = createGlobe(canvasRef.current as HTMLCanvasElement, {
      devicePixelRatio: 2,
      width: 400 * 2,
      height: 400 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 0.8,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.8, 0.1, 0.1],
      glowColor: [0.2, 0.2, 0.2],
      markers: [],
      opacity: 0.7,
      onRender: (state: any) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.

        // Get the current positions from our map
        state.markers = [...positions.current.values()];

        // Rotate the globe
        state.phi = phi;
        phi += 0.01;

        // Tambahkan visualisasi traffic pesawat
        state.paths = flightLines.map(
          (line: {
            from: [number, number];
            to: [number, number];
            id: string;
          }) => ({
            startLat: line.from[0],
            startLng: line.from[1],
            endLat: line.to[0],
            endLng: line.to[1],
            color: [0.5, 0.8, 1],
          })
        );
      },
    });

    return () => {
      globe.destroy();
    };
  }, [flightLines]);

  return (
    <div className="App">
      <h1>Where's everyone at?</h1>
      {counter !== 0 ? (
        <p>
          <b>{counter}</b> {counter === 1 ? "person" : "people"} connected.
        </p>
      ) : (
        <p>&nbsp;</p>
      )}

      {/* The canvas where we'll render the globe */}
      <canvas
        ref={canvasRef as LegacyRef<HTMLCanvasElement>}
        style={{ width: 400, height: 400, maxWidth: "100%", aspectRatio: 1 }}
      />

      {/* Tambahan: Legend traffic pesawat */}
      <div
        style={{
          margin: "1rem 0 0.5rem 0",
          fontSize: "0.95rem",
          color: "#7fdbff",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 16,
            height: 3,
            background: "#7fdbff",
            borderRadius: 2,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        ></span>
        Realtime World Flight Traffic
      </div>

      {/* Let's give some credit */}
      <p>
        Powered by <a href="https://cobe.vercel.app/">🌏 Cobe</a>,{" "}
        <a href="https://www.npmjs.com/package/phenomenon">Phenomenon</a> and{" "}
        <a href="https://npmjs.com/package/partyserver/">🎈 PartyServer</a>
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
