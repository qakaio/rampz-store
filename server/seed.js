export const seed = Object.freeze({
  categories: [
    "Glassware",
    "Equipment",
    "Reagents & Solutions",
    "Safety",
    "Tools & Accessories",
    "Learning Kits",
  ],
  products: [
    { id: 1, name: "Test Tube 15x150mm (Pack of 10)", category: "Glassware", price: 29.9, stock: 120, symbol: "T", description: "A dependable everyday essential for classroom experiments and careful sample handling. Supplied in a handy pack of ten.", specifications: { "Size": "15 x 150 mm", "Pack quantity": "10 tubes", "Material": "Glass" } },
    { id: 2, name: "Screw Cap Test Tube 16x100mm", category: "Glassware", price: 39.9, stock: 80, symbol: "T", description: "A compact glass test tube with a secure screw cap for sample storage and simple lab activities.", specifications: { "Size": "16 x 100 mm", "Closure": "Screw cap", "Material": "Glass" } },
    { id: 3, name: "Glass Beaker 250ml", category: "Glassware", price: 18.5, stock: 200, symbol: "B", description: "A versatile 250 ml beaker for mixing, measuring, and pouring in the learning lab.", specifications: { "Capacity": "250 ml", "Material": "Glass", "Graduations": "Approximate volume markings" } },
    { id: 4, name: "Erlenmeyer Flask 500ml", category: "Glassware", price: 34, stock: 75, symbol: "E", description: "A classic 500 ml conical flask designed for easy swirling and everyday lab use.", specifications: { "Capacity": "500 ml", "Shape": "Conical", "Material": "Glass" } },
    { id: 5, name: "Graduated Cylinder 100ml", category: "Glassware", price: 42.9, stock: 60, symbol: "G", description: "A 100 ml graduated cylinder for clear, careful volume measurements.", specifications: { "Capacity": "100 ml", "Scale": "Graduated volume markings", "Material": "Glass" } },
    { id: 6, name: "Volumetric Flask 250ml", category: "Glassware", price: 56, stock: 40, symbol: "V", description: "A 250 ml volumetric flask for preparing and measuring solutions with care.", specifications: { "Capacity": "250 ml", "Type": "Volumetric flask", "Material": "Glass" } },
    { id: 7, name: "Graduated Pipette 10ml", category: "Glassware", price: 12.9, stock: 150, symbol: "P", description: "A graduated 10 ml pipette for measured liquid transfer in classroom and lab settings.", specifications: { "Capacity": "10 ml", "Type": "Graduated pipette", "Material": "Glass" } },
    { id: 8, name: "Test Tube Rack (12 Slots)", category: "Tools & Accessories", price: 24.9, stock: 90, symbol: "R", description: "Keep up to twelve test tubes upright and organized while you work.", specifications: { "Capacity": "12 test tubes", "Use": "Upright tube organization" } },
    { id: 9, name: "Bunsen Burner", category: "Equipment", price: 89.9, stock: 25, symbol: "B", description: "A laboratory burner for supervised educational demonstrations. Use only with appropriate training and safety equipment.", specifications: { "Type": "Laboratory burner", "Use": "Supervised educational demonstrations" } },
    { id: 10, name: "Precision Scale 0.01g", category: "Equipment", price: 349, stock: 15, symbol: "S", description: "A precision scale with 0.01 g readability for experiments where careful measurement matters.", specifications: { "Readability": "0.01 g", "Use": "Precision weighing" } },
    { id: 11, name: "1000x Biological Microscope", category: "Equipment", price: 1299, stock: 8, symbol: "M", description: "A biological microscope for bringing the details of the natural world into focus.", specifications: { "Maximum magnification": "1000x", "Type": "Biological microscope" } },
    { id: 12, name: "Magnetic Stirrer with Heating", category: "Equipment", price: 899, stock: 0, symbol: "M", description: "A magnetic stirrer with heating for controlled mixing. Currently out of stock.", specifications: { "Function": "Magnetic stirring", "Heating": "Integrated heating" } },
    { id: 13, name: "6-Tube Bench Centrifuge", category: "Equipment", price: 1890, stock: 3, symbol: "C", description: "A compact bench centrifuge holding six tubes. Limited stock available.", specifications: { "Capacity": "6 tubes", "Type": "Bench centrifuge" } },
    { id: 14, name: "Clear Safety Glasses", category: "Safety", price: 15.9, stock: 300, symbol: "S", description: "Clear protective eyewear for appropriate educational activities and lab environments.", specifications: { "Lens": "Clear", "Type": "Protective eyewear" } },
    { id: 15, name: "White Cotton Lab Coat (S/M/L)", category: "Safety", price: 79.9, stock: 100, symbol: "L", description: "A white cotton lab coat in a choice of sizes to support everyday lab safety.", specifications: { "Material": "Cotton", "Color": "White", "Available sizes": "S, M, L" } },
    { id: 16, name: "Nitrile Gloves (Box of 100)", category: "Safety", price: 49.9, stock: 250, symbol: "N", description: "A box of 100 nitrile gloves for general lab and educational use.", specifications: { "Material": "Nitrile", "Pack quantity": "100 gloves" } },
    { id: 17, name: "pH Indicator Paper Roll", category: "Reagents & Solutions", price: 9.9, stock: 500, symbol: "pH", description: "A convenient indicator paper roll for introductory, educational pH activities.", specifications: { "Format": "Roll", "Use": "Introductory pH activities" } },
    { id: 18, name: "Basic School Chemistry Kit", category: "Learning Kits", price: 199, stock: 30, symbol: "K", description: "An educational starter kit assembled for exploring foundational chemistry concepts.", specifications: { "Audience": "School learning", "Use": "Foundational chemistry activities" } },
    { id: 19, name: "Wooden Test Tube Holder", category: "Tools & Accessories", price: 7.5, stock: 180, symbol: "H", description: "A simple wooden holder for gripping a test tube during appropriate supervised demonstrations.", specifications: { "Material": "Wood", "Use": "Holds a test tube" } },
    { id: 20, name: "Laboratory Thermometer -10 to 110°C", category: "Equipment", price: 22, stock: 110, symbol: "°", description: "A laboratory thermometer with a measurement range from -10 to 110 degrees Celsius.", specifications: { "Temperature range": "-10 to 110 °C", "Type": "Laboratory thermometer" } },
  ],
  users: [
    { id: "demo-customer", email: "cliente@rampz.test", role: "CUSTOMER", status: "active" },
    { id: "demo-new-customer", email: "novo@rampz.test", role: "CUSTOMER", status: "active" },
    { id: "demo-admin", email: "admin@rampz.test", role: "ADMIN", status: "active" },
    { id: "demo-blocked", email: "bloqueado@rampz.test", role: "CUSTOMER", status: "blocked" },
    { id: "demo-inactive", email: "inativo@rampz.test", role: "CUSTOMER", status: "inactive" },
  ],
  orders: [
    { number: "RMP-2026-000001", status: "PAGO", productId: 3, quantity: 2, email: "cliente@rampz.test" },
    { number: "RMP-2026-000002", status: "AGUARDANDO_PAGAMENTO", productId: 8, quantity: 1, email: "cliente@rampz.test" },
  ],
});

export function createSeedState() {
  return structuredClone(seed);
}
