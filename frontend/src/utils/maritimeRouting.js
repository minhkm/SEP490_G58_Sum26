/**
 * maritimeRouting.js
 * Hệ thống định tuyến luồng hàng hải an toàn & kiểm tra cắt ngang đất liền cho khu vực Biển Đông & Đông Nam Á.
 */

// ==========================================
// 1. CÁC ĐIỂM MỐC HÀNG HẢI TIÊU CHUẨN (SEA HUBS)
// ==========================================
export const MARITIME_NODES = {
  // --- Vịnh Bắc Bộ ---
  GULF_TONKIN_NORTH: { id: 'GULF_TONKIN_NORTH', name: 'Cửa Vịnh Bắc Bộ (Bắc)', lat: 20.60, lng: 107.50 },
  GULF_TONKIN_MID: { id: 'GULF_TONKIN_MID', name: 'Giữa Vịnh Bắc Bộ', lat: 19.30, lng: 107.60 },
  GULF_TONKIN_SOUTH: { id: 'GULF_TONKIN_SOUTH', name: 'Cửa Vịnh Bắc Bộ (Nam)', lat: 17.60, lng: 108.00 },

  // --- Duyên hải Miền Trung & Nam Trung Bộ Việt Nam ---
  DANANG_OFFSHORE: { id: 'DANANG_OFFSHORE', name: 'Ngoài khơi Đà Nẵng / Sơn Trà', lat: 16.35, lng: 108.60 },
  QUY_NHON_OFFSHORE: { id: 'QUY_NHON_OFFSHORE', name: 'Ngoài khơi Quy Nhơn', lat: 13.80, lng: 109.60 },
  NHA_TRANG_OFFSHORE: { id: 'NHA_TRANG_OFFSHORE', name: 'Ngoài khơi Nha Trang / Cam Ranh', lat: 12.20, lng: 109.65 },
  PHAN_THIET_OFFSHORE: { id: 'PHAN_THIET_OFFSHORE', name: 'Ngoài khơi Phan Thiết', lat: 10.60, lng: 108.50 },
  VUNG_TAU_OFFSHORE: { id: 'VUNG_TAU_OFFSHORE', name: 'Phao số 0 Vũng Tàu', lat: 10.25, lng: 107.05 },

  // --- Miền Nam & Vòng Mũi Cà Mau ---
  CON_DAO_OFFSHORE: { id: 'CON_DAO_OFFSHORE', name: 'Ngoài khơi Côn Đảo', lat: 8.65, lng: 106.80 },
  CA_MAU_SOUTH_OFFSHORE: { id: 'CA_MAU_SOUTH_OFFSHORE', name: 'Ngoài khơi Nam Mũi Cà Mau', lat: 8.10, lng: 104.80 },
  CA_MAU_WEST_OFFSHORE: { id: 'CA_MAU_WEST_OFFSHORE', name: 'Ngoài khơi Tây Cà Mau / Kiên Giang', lat: 9.20, lng: 103.80 },

  // --- Vịnh Thái Lan (Thái Lan / Campuchia) ---
  GULF_THAILAND_ENTRANCE: { id: 'GULF_THAILAND_ENTRANCE', name: 'Cửa Vịnh Thái Lan', lat: 7.80, lng: 103.50 },
  GULF_THAILAND_MID: { id: 'GULF_THAILAND_MID', name: 'Giữa Vịnh Thái Lan', lat: 10.20, lng: 101.50 },
  GULF_THAILAND_NORTH: { id: 'GULF_THAILAND_NORTH', name: 'Tiếp cận Bangkok / Laem Chabang', lat: 12.80, lng: 100.80 },
  SIHANOUKVILLE_APPROACH: { id: 'SIHANOUKVILLE_APPROACH', name: 'Tiếp cận Sihanoukville (Campuchia)', lat: 10.50, lng: 103.40 },

  // --- Bờ Đông Bán đảo Malaysia & Singapore ---
  MALAYSIA_EAST_NORTH: { id: 'MALAYSIA_EAST_NORTH', name: 'Ngoài khơi Kelantan / Terengganu', lat: 5.80, lng: 103.80 },
  MALAYSIA_EAST_MID: { id: 'MALAYSIA_EAST_MID', name: 'Ngoài khơi Kuantan / Tioman', lat: 3.50, lng: 104.50 },
  SINGAPORE_STRAIT_EAST: { id: 'SINGAPORE_STRAIT_EAST', name: 'Cửa Đông Eo biển Singapore (Horsburgh)', lat: 1.40, lng: 104.45 },
  SINGAPORE_PORT_APPROACH: { id: 'SINGAPORE_PORT_APPROACH', name: 'Tiếp cận Cảng Singapore (PSA / Jurong)', lat: 1.22, lng: 103.75 },
  SINGAPORE_STRAIT_WEST: { id: 'SINGAPORE_STRAIT_WEST', name: 'Cửa Tây Eo biển Singapore / Tg Pelepas', lat: 1.25, lng: 103.50 },

  // --- Eo biển Malacca ---
  MALACCA_SOUTH: { id: 'MALACCA_SOUTH', name: 'Eo biển Malacca (Nam)', lat: 2.00, lng: 102.30 },
  PORT_KLANG_APPROACH: { id: 'PORT_KLANG_APPROACH', name: 'Tiếp cận Port Klang (Malaysia)', lat: 3.00, lng: 101.20 },
  PENANG_APPROACH: { id: 'PENANG_APPROACH', name: 'Tiếp cận Cảng Penang (Malaysia)', lat: 5.45, lng: 100.20 },
  MALACCA_NORTH: { id: 'MALACCA_NORTH', name: 'Cửa Bắc Eo biển Malacca (Aceh / Phuket)', lat: 6.00, lng: 97.50 },

  // --- Đông Bắc Á & Philippines & Borneo ---
  TAIWAN_STRAIT_SOUTH: { id: 'TAIWAN_STRAIT_SOUTH', name: 'Phía Nam Eo biển Đài Loan / Cao Hùng', lat: 22.20, lng: 119.80 },
  MANILA_APPROACH: { id: 'MANILA_APPROACH', name: 'Ngoài khơi Cảng Manila (Philippines)', lat: 14.50, lng: 120.50 },
  BRUNEI_APPROACH: { id: 'BRUNEI_APPROACH', name: 'Ngoài khơi Muara (Brunei / Borneo)', lat: 5.30, lng: 115.10 },
  JAKARTA_APPROACH: { id: 'JAKARTA_APPROACH', name: 'Ngoài khơi Jakarta (Indonesia)', lat: -5.80, lng: 106.90 },
};

// ==========================================
// 2. ĐỒ THỊ KẾT NỐI LUỒNG HÀNG HẢI AN TOÀN (EDGES)
// ==========================================
const SEA_GRAPH_EDGES = [
  // Vịnh Bắc Bộ ➔ Duyên hải miền Trung
  ['GULF_TONKIN_NORTH', 'GULF_TONKIN_MID'],
  ['GULF_TONKIN_MID', 'GULF_TONKIN_SOUTH'],
  ['GULF_TONKIN_SOUTH', 'DANANG_OFFSHORE'],

  // Dọc Biển Đông Miền Trung ➔ Miền Nam
  ['DANANG_OFFSHORE', 'QUY_NHON_OFFSHORE'],
  ['QUY_NHON_OFFSHORE', 'NHA_TRANG_OFFSHORE'],
  ['NHA_TRANG_OFFSHORE', 'PHAN_THIET_OFFSHORE'],
  ['PHAN_THIET_OFFSHORE', 'VUNG_TAU_OFFSHORE'],
  ['PHAN_THIET_OFFSHORE', 'CON_DAO_OFFSHORE'],
  ['VUNG_TAU_OFFSHORE', 'CON_DAO_OFFSHORE'],

  // Côn Đảo ➔ Vòng qua Mũi Cà Mau
  ['CON_DAO_OFFSHORE', 'CA_MAU_SOUTH_OFFSHORE'],
  ['CA_MAU_SOUTH_OFFSHORE', 'CA_MAU_WEST_OFFSHORE'],

  // Vòng Cà Mau ➔ Vịnh Thái Lan / Campuchia
  ['CA_MAU_WEST_OFFSHORE', 'SIHANOUKVILLE_APPROACH'],
  ['CA_MAU_WEST_OFFSHORE', 'GULF_THAILAND_ENTRANCE'],
  ['GULF_THAILAND_ENTRANCE', 'GULF_THAILAND_MID'],
  ['GULF_THAILAND_MID', 'GULF_THAILAND_NORTH'],
  ['SIHANOUKVILLE_APPROACH', 'GULF_THAILAND_MID'],

  // Côn Đảo / Cà Mau ➔ Bờ Đông Malaysia ➔ Singapore
  ['CON_DAO_OFFSHORE', 'MALAYSIA_EAST_NORTH'],
  ['CA_MAU_SOUTH_OFFSHORE', 'MALAYSIA_EAST_NORTH'],
  ['GULF_THAILAND_ENTRANCE', 'MALAYSIA_EAST_NORTH'],
  ['MALAYSIA_EAST_NORTH', 'MALAYSIA_EAST_MID'],
  ['MALAYSIA_EAST_MID', 'SINGAPORE_STRAIT_EAST'],
  ['SINGAPORE_STRAIT_EAST', 'SINGAPORE_PORT_APPROACH'],
  ['SINGAPORE_PORT_APPROACH', 'SINGAPORE_STRAIT_WEST'],

  // Eo biển Singapore ➔ Eo biển Malacca
  ['SINGAPORE_STRAIT_WEST', 'MALACCA_SOUTH'],
  ['MALACCA_SOUTH', 'PORT_KLANG_APPROACH'],
  ['PORT_KLANG_APPROACH', 'PENANG_APPROACH'],
  ['PENANG_APPROACH', 'MALACCA_NORTH'],

  // Quốc tế: Đà Nẵng / Nha Trang ➔ Philippines / Đài Loan / Borneo
  ['DANANG_OFFSHORE', 'TAIWAN_STRAIT_SOUTH'],
  ['NHA_TRANG_OFFSHORE', 'MANILA_APPROACH'],
  ['NHA_TRANG_OFFSHORE', 'BRUNEI_APPROACH'],
  ['SINGAPORE_STRAIT_EAST', 'JAKARTA_APPROACH'],
  ['BRUNEI_APPROACH', 'MANILA_APPROACH'],
];

// ==========================================
// 3. TÍNH KHOẢNG CÁCH HÀNG HẢI (HAVERSINE NAUTICAL MILES)
// ==========================================
export function calculateDistanceNM(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Bán kính Trái Đất tính bằng Hải lý (Nautical Miles)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==========================================
// 4. KIỂM TRA ĐOẠN ĐƯỜNG CẮT NGANG ĐẤT LIỀN (LAND COLLISION)
// ==========================================
// Đa giác bao bọc đất liền Đông Dương (Việt Nam, Lào, Campuchia, Thái Lan, Bán đảo Mã Lai)
const INDOCHINA_LAND_POLYGON = [
  [21.5, 102.0],
  [22.5, 103.5],
  [22.8, 105.0],
  [21.8, 106.8],
  [20.8, 106.5],
  [19.8, 105.7],
  [18.5, 105.6],
  [17.5, 106.3],
  [16.5, 107.5],
  [16.0, 108.2],
  [14.5, 109.0],
  [13.0, 109.3],
  [11.5, 108.8],
  [10.5, 107.2],
  [9.5, 105.5],
  [8.6, 104.7], // Mũi Cà Mau
  [9.5, 104.5],
  [10.3, 103.8],
  [11.5, 103.0],
  [12.5, 101.8],
  [13.5, 100.5], // Bangkok
  [12.0, 99.8],
  [9.0, 98.8],
  [6.0, 100.2],
  [4.0, 101.0],
  [2.0, 102.5],
  [1.4, 103.6], // Johor
  [2.5, 104.0],
  [4.5, 103.5],
  [6.0, 102.2],
  [8.0, 100.5],
  [10.0, 99.2],
  [13.0, 99.5],
  [16.0, 98.5],
  [19.0, 98.0],
  [20.5, 100.0],
];

const PALAWAN_POLYGON = [
  [11.5, 119.5],
  [10.5, 119.0],
  [9.0, 117.5],
  [8.3, 117.0],
  [8.0, 117.3],
  [9.0, 118.0],
  [10.0, 119.2],
  [11.2, 119.8],
  [11.5, 119.5]
];

const BORNEO_POLYGON = [
  [7.0, 117.0],
  [5.0, 119.0],
  [1.0, 119.0],
  [-4.0, 116.0],
  [-4.0, 110.0],
  [-1.0, 109.0],
  [2.0, 109.5],
  [7.0, 117.0]
];

const TAIWAN_POLYGON = [
  [25.3, 121.5],
  [22.0, 121.0],
  [22.0, 120.0],
  [25.0, 121.0],
  [25.3, 121.5]
];

const HAINAN_POLYGON = [
  [20.0, 111.0],
  [18.2, 110.0],
  [18.5, 108.6],
  [19.5, 109.0],
  [20.0, 111.0]
];

const PHILIPPINES_MAIN_POLYGON = [
  [18.5, 122.0],
  [13.0, 124.0],
  [6.0, 126.0],
  [5.0, 125.0],
  [7.0, 122.0],
  [14.0, 120.0],
  [16.0, 119.5],
  [18.5, 122.0]
];

const LAND_POLYGONS = [
  INDOCHINA_LAND_POLYGON,
  PALAWAN_POLYGON,
  BORNEO_POLYGON,
  TAIWAN_POLYGON,
  HAINAN_POLYGON,
  PHILIPPINES_MAIN_POLYGON
];

// Hàm kiểm tra 1 điểm có nằm trong đa giác đất liền hay không (Ray-casting algorithm)
export function isPointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isWaterCoordinate(lat, lng) {
  for (const polygon of LAND_POLYGONS) {
    if (isPointInPolygon([lat, lng], polygon)) {
      return false;
    }
  }
  return true;
}

// Kiểm tra xem đoạn thẳng giữa p1 và p2 có cắt qua đất liền Đông Dương hay không
export function checkSegmentCrossesLand(p1, p2, samples = 12) {
  // Lấy mẫu các điểm trung gian dọc theo đoạn thẳng (ngoại trừ 2 đầu cảng)
  for (let step = 1; step < samples; step++) {
    const fraction = step / samples;
    const sampleLat = p1.lat + (p2.lat - p1.lat) * fraction;
    const sampleLng = p1.lng + (p2.lng - p1.lng) * fraction;

    for (const polygon of LAND_POLYGONS) {
      if (isPointInPolygon([sampleLat, sampleLng], polygon)) {
        return true; // Cắt ngang đất liền!
      }
    }
  }
  return false;
}

// Kiểm tra toàn bộ danh sách waypoints
export function validateRouteSafety(waypoints) {
  if (!waypoints || waypoints.length < 2) {
    return { isSafe: true, unsafeSegments: [] };
  }

  const unsafeSegments = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const crossesLand = checkSegmentCrossesLand(p1, p2);
    if (crossesLand) {
      unsafeSegments.push(i);
    }
  }

  return {
    isSafe: unsafeSegments.length === 0,
    unsafeSegments,
  };
}

// ==========================================
// 5. THUẬT TOÁN TÌM LUỒNG HÀNG HẢI TỰ ĐỘNG (DIJKSTRA SEA ROUTER)
// ==========================================
function findNearestSeaNode(lat, lng) {
  let nearestNode = null;
  let minDistance = Infinity;

  Object.values(MARITIME_NODES).forEach((node) => {
    // Không kết nối trực tiếp nếu đoạn từ cảng đến node cắt đất liền
    const dist = calculateDistanceNM(lat, lng, node.lat, node.lng);
    const crosses = checkSegmentCrossesLand({ lat, lng }, { lat: node.lat, lng: node.lng }, 8);
    const penalty = crosses ? 99999 : 0;

    if (dist + penalty < minDistance) {
      minDistance = dist + penalty;
      nearestNode = node;
    }
  });

  // Nếu không tìm được node an toàn, lấy node có khoảng cách hình học gần nhất
  if (!nearestNode) {
    let fallbackMin = Infinity;
    Object.values(MARITIME_NODES).forEach((node) => {
      const dist = calculateDistanceNM(lat, lng, node.lat, node.lng);
      if (dist < fallbackMin) {
        fallbackMin = dist;
        nearestNode = node;
      }
    });
  }

  return nearestNode;
}

export function generateSafeMaritimeRoute(startPoint, endPoint) {
  if (!startPoint || !endPoint) return [];

  // 1. Tìm node biển gần nhất cho điểm xuất phát và đích
  const startNode = findNearestSeaNode(startPoint.lat, startPoint.lng);
  const endNode = findNearestSeaNode(endPoint.lat, endPoint.lng);

  if (!startNode || !endNode) {
    return [startPoint, endPoint];
  }

  if (startNode.id === endNode.id) {
    return [startPoint, { lat: startNode.lat, lng: startNode.lng }, endPoint];
  }

  // 2. Xây dựng danh sách kề cho đồ thị luồng hàng hải
  const graph = {};
  Object.keys(MARITIME_NODES).forEach((k) => {
    graph[k] = [];
  });

  SEA_GRAPH_EDGES.forEach(([u, v]) => {
    if (MARITIME_NODES[u] && MARITIME_NODES[v]) {
      const dist = calculateDistanceNM(
        MARITIME_NODES[u].lat,
        MARITIME_NODES[u].lng,
        MARITIME_NODES[v].lat,
        MARITIME_NODES[v].lng
      );
      graph[u].push({ node: v, weight: dist });
      graph[v].push({ node: u, weight: dist });
    }
  });

  // 3. Chạy thuật toán Dijkstra tìm đường ngắn nhất trên biển
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(MARITIME_NODES));

  Object.keys(MARITIME_NODES).forEach((nodeId) => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  });
  distances[startNode.id] = 0;

  while (unvisited.size > 0) {
    // Tìm node chưa thăm có khoảng cách nhỏ nhất
    let current = null;
    let minD = Infinity;
    unvisited.forEach((nodeId) => {
      if (distances[nodeId] < minD) {
        minD = distances[nodeId];
        current = nodeId;
      }
    });

    if (!current || distances[current] === Infinity || current === endNode.id) {
      break;
    }

    unvisited.delete(current);

    // Cập nhật khoảng cách các node kề
    (graph[current] || []).forEach(({ node: neighbor, weight }) => {
      if (unvisited.has(neighbor)) {
        const alt = distances[current] + weight;
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = current;
        }
      }
    });
  }

  // 4. Tái tạo đường đi từ endNode về startNode
  const pathNodes = [];
  let curr = endNode.id;
  while (curr) {
    pathNodes.unshift(curr);
    curr = previous[curr];
  }

  // Nếu không tìm được đường kết nối trong đồ thị, trả về đường thẳng với 2 node biển
  if (pathNodes[0] !== startNode.id) {
    return [
      startPoint,
      { lat: startNode.lat, lng: startNode.lng },
      { lat: endNode.lat, lng: endNode.lng },
      endPoint,
    ];
  }

  // 5. Tạo danh sách Waypoints đầy đủ
  const waypoints = [
    startPoint,
    ...pathNodes.map((id) => ({
      lat: MARITIME_NODES[id].lat,
      lng: MARITIME_NODES[id].lng,
      name: MARITIME_NODES[id].name,
    })),
    endPoint,
  ];

  return waypoints;
}
