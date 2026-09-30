import React, { useEffect, PureComponent, useState } from "react";
import ReactMapGL, { CanvasOverlay, Marker, NavigationControl } from "react-map-gl";
import { Source, Layer } from "react-map-gl";
// import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";

const accessToken =process.env.EXPO_PUBLIC_MAPBOX_TOKEN
 

const MyMap = () => {
  // const { deliveryId } = useParams();
  const [viewport, setViewport] = useState({
    latitude: 35.8371899,
    longitude: 10.6264739,
    zoom: 12,
  });
  const [loaded, setloaded] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState([
    {
      latitude: 35.83,
      longitude: 10.6,
    },
    {
      latitude: 35.84,
      longitude: 10.62,
    },
  ]);

  useEffect(() => {
    // Fetch data or perform other setup
    setloaded(true);
    if (navigator)
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          setViewport({ latitude, longitude, zoom: 12 });
        }
      );
  }, []);
  // const lineCoordinates = deliveryAddresses.map((address) => [
  //   address.longitude,
  //   address.latitude,
  // ]);
  const [points, setPoints] = useState([
    {
      latitude: 35.83,
      longitude: 10.6,
    },
    {
      latitude: 35.84,
      longitude: 10.62,
    },
  ]);
  // const lineString = {
  //   type: "Feature",
  //   properties: {},
  //   geometry: {
  //     type: "LineString",
  //     coordinates: points.map((point) => [point.longitude, point.latitude]),
  //   },
  // };
  useEffect(() => {
    // Create a new Directions object and add it to the map
    // const directions = new MapboxDirections({
    //   accessToken,
    //   unit: "metric", // 'metric' or 'imperial'
    //   profile: "mapbox/driving",
    // });
    // Add waypoints to the directions object
    // directions.setOrigin([points[0].longitude, points[0].latitude]);
    // directions.setDestination([points[1].longitude, points[1].latitude]);
    // // Add waypoints for additional stops if needed
    // for (let i = 2; i < points.length; i++) {
    //   directions.addWaypoint(i - 1, [points[i].longitude, points[i].latitude]);
    // }
    // Add the directions control to the map
    // const map = directions.getMap();
    // map.addControl(directions, "top-left");
  }, [points]);
  return (
    <ReactMapGL
      {...viewport}
      interactive
      width="100%"
      height="400px"
      mapStyle="mapbox://styles/mapbox/streets-v11"
      onViewportChange={(newViewport) => setViewport(newViewport)}
      mapboxApiAccessToken={accessToken}
      mapboxAccessToken={accessToken}
    >
      {/* Example Marker */}
      <Marker {...viewport}>
        <div style={{ fontSize: "40px" }}>📍</div>
      </Marker>
      {deliveryAddresses.map((address, index) => (
        <Marker
          key={index}
          latitude={address.latitude}
          longitude={address.longitude}
        >
          <div>🚚</div>
        </Marker>
      ))}
      {/* Line connecting points */}
      {/* <Source id="line" type="geojson" data={lineString}>
        <Layer
          id="line-layer"
          type="line"
          source="line"
          paint={{
            "line-color": "#00F",
            "line-width": 4,
          }}
        />
      </Source> */}
      {/* <MapboxDirections
        mapboxApiAccessToken={accessToken}
        options={{
          unit: "metric", // 'metric' or 'imperial'
          profile: "mapbox/driving",
        }}
        onViewportChange={(newViewport) => setViewport(newViewport)}
      /> */}
      {/* Navigation Control for zooming in and out */}
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <NavigationControl />
      </div>
    </ReactMapGL>
  );
};

export default MyMap;
class PolylineOverlay extends PureComponent {
  _redraw({ width, height, ctx, isDragging, project, unproject }) {
    const {
      points,
      color = "red",
      lineWidth = 2,
      renderWhileDragging = true,
    } = this.props;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    if ((renderWhileDragging || !isDragging) && points) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.beginPath();
      points.forEach((point) => {
        const pixel = project([point[0], point[1]]);
        ctx.lineTo(pixel[0], pixel[1]);
      });
      ctx.stroke();
    }
  }

  render() {
    return <CanvasOverlay redraw={this._redraw.bind(this)} />;
  }
}
