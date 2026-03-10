export const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";

export const USERS = {
  superAdmin: { email: "admin@test.com",   password: "password123" },
  bd:         { email: "bd@test.com",       password: "password123" },
  finance:    { email: "finance@test.com",  password: "password123" },
  sales:      { email: "sales@test.com",    password: "password123" },
  content:    { email: "content@test.com",  password: "password123" },
  desain:     { email: "desain@test.com",   password: "password123" },
};

// Threshold global — semua script inherit ini
export const BASE_THRESHOLDS = {
  http_req_duration: ["p(95)<2000", "p(99)<4000"],
  http_req_failed:   ["rate<0.01"],
};
