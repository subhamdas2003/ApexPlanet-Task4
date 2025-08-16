/* =========================
   Theme + Utilities
========================= */
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme") || "dark";
applyTheme(savedTheme);

function applyTheme(mode) {
  if (mode === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  themeToggle.textContent = mode === "light" ? "🌙" : "☀️";
  localStorage.setItem("theme", mode);
}
themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  applyTheme(next);
});

document.getElementById("year").textContent = new Date().getFullYear();

/* =========================
   DOM refs
========================= */
const searchInput = document.getElementById("searchInput");
const priceRange = document.getElementById("priceRange");
const priceValue = document.getElementById("priceValue");
const sortSelect = document.getElementById("sortSelect");
const categoryList = document.getElementById("categoryList");
const clearFiltersBtn = document.getElementById("clearFilters");
const refreshBtn = document.getElementById("refreshBtn");

const grid = document.getElementById("grid");
const loader = document.getElementById("loader");
const empty = document.getElementById("empty");
const resultMeta = document.getElementById("resultMeta");

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartSubtotal = document.getElementById("cartSubtotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const clearCartBtn = document.getElementById("clearCartBtn");

/* =========================
   State
========================= */
let allProducts = [];
let categories = [];
let filters = {
  q: "",
  maxPrice: 500,
  category: null,
  sort: "relevance",
};

let cart = JSON.parse(localStorage.getItem("cart") || "[]");

/* =========================
   Data fetching (with fallback)
========================= */
const API = {
  products: "https://fakestoreapi.com/products",
  categories: "https://fakestoreapi.com/products/categories",
};

// Offline/safety fallback minimal data
const FALLBACK_PRODUCTS = [
  {id: 1, title: "Fallback Tee", price: 19.99, category: "clothing", image: "https://picsum.photos/seed/tee/400/400", rating: {rate: 4.2}},
  {id: 2, title: "Fallback Headphones", price: 59.99, category: "electronics", image: "https://picsum.photos/seed/head/400/400", rating: {rate: 4.5}},
  {id: 3, title: "Fallback Backpack", price: 39.99, category: "bags", image: "https://picsum.photos/seed/bag/400/400", rating: {rate: 4.0}},
  {id: 4, title: "Fallback Watch", price: 79.99, category: "accessories", image: "https://picsum.photos/seed/watch/400/400", rating: {rate: 4.6}},
];

async function loadData() {
  show(loader); hide(empty);
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(API.products, { cache: "no-store" }),
      fetch(API.categories, { cache: "no-store" }),
    ]);
    if (!pRes.ok || !cRes.ok) throw new Error("API error");
    allProducts = await pRes.json();
    categories = await cRes.json();
  } catch (e) {
    console.warn("Using fallback data:", e.message);
    allProducts = FALLBACK_PRODUCTS;
    categories = [...new Set(FALLBACK_PRODUCTS.map(p => p.category))];
  }

  buildCategoryChips();
  applyFiltersAndRender();
}

function buildCategoryChips() {
  categoryList.innerHTML = "";
  const allChip = chipEl("All", null);
  categoryList.appendChild(allChip);
  categories.forEach(c => categoryList.appendChild(chipEl(cap(c), c)));

  function chipEl(label, value) {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = label;
    b.dataset.value = value ?? "";
    if (filters.category === value) b.classList.add("active");
    b.addEventListener("click", () => {
      filters.category = value;
      [...categoryList.children].forEach(child => child.classList.remove("active"));
      b.classList.add("active");
      applyFiltersAndRender();
    });
    return b;
  }
}

/* =========================
   Filtering, Sorting, Rendering
========================= */
function applyFiltersAndRender() {
  let products = [...allProducts];

  if (filters.q) {
    products = products.filter(p =>
      p.title.toLowerCase().includes(filters.q.toLowerCase())
    );
  }
  if (filters.category) {
    products = products.filter(p => p.category === filters.category);
  }
  products = products.filter(p => p.price <= filters.maxPrice);

  switch (filters.sort) {
    case "price-asc": products.sort((a,b)=>a.price-b.price); break;
    case "price-desc": products.sort((a,b)=>b.price-a.price); break;
    case "rating-desc": products.sort((a,b)=> (b.rating?.rate||0)-(a.rating?.rate||0)); break;
    case "alpha-asc": products.sort((a,b)=>a.title.localeCompare(b.title)); break;
    case "alpha-desc": products.sort((a,b)=>b.title.localeCompare(a.title)); break;
  }

  renderProducts(products);
}

function renderProducts(products) {
  grid.innerHTML = "";
  hide(loader);

  if (!products.length) {
    show(empty);
    resultMeta.textContent = "";
    return;
  }

  hide(empty);
  resultMeta.textContent = `${products.length} results`;

  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "card product";

    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}" class="thumb" />
      <div class="title">${p.title}</div>
      <div class="price">$${p.price.toFixed(2)}</div>
      <div class="meta">
        <span>⭐ ${p.rating?.rate || "N/A"}</span>
        <span>${cap(p.category)}</span>
      </div>
      <div class="actions">
        <button class="btn small primary">Add to Cart</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", ()=> addToCart(p));
    grid.appendChild(card);
  });
}

/* =========================
   Cart
========================= */
function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1 });
  saveCart();
  renderCart();
}
function renderCart() {
  cartItems.innerHTML = "";
  if (!cart.length) {
    cartItems.innerHTML = `<p class="muted">Cart is empty.</p>`;
    cartSubtotal.textContent = "$0.00";
    cartCount.textContent = "0";
    return;
  }
  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.price * item.qty;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.title}" />
      <div>
        <div class="small">${item.title}</div>
        <div class="qty-row">
          <button class="btn small ghost">-</button>
          <span>${item.qty}</span>
          <button class="btn small ghost">+</button>
        </div>
      </div>
      <div>$${(item.price*item.qty).toFixed(2)}</div>
    `;
    const [minus, , plus] = div.querySelectorAll("button");
    minus.addEventListener("click", ()=> updateQty(item.id, item.qty-1));
    plus.addEventListener("click", ()=> updateQty(item.id, item.qty+1));
    cartItems.appendChild(div);
  });
  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartCount.textContent = String(cart.reduce((s,i)=>s+i.qty,0));
}
function updateQty(id, qty) {
  const idx = cart.findIndex(i=>i.id===id);
  if (idx>=0) {
    if (qty<=0) cart.splice(idx,1);
    else cart[idx].qty = qty;
    saveCart(); renderCart();
  }
}
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); }

/* =========================
   Drawer toggle
========================= */
cartBtn.addEventListener("click", ()=> {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden","false");
});
drawerBackdrop.addEventListener("click", closeCartDrawer);
closeCart.addEventListener("click", closeCartDrawer);

function closeCartDrawer(){
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden","true");
}

/* =========================
   Filter Events
========================= */
searchInput.addEventListener("input", e => { filters.q = e.target.value; applyFiltersAndRender(); });
priceRange.addEventListener("input", e => {
  filters.maxPrice = +e.target.value;
  priceValue.textContent = `$${filters.maxPrice}`;
  applyFiltersAndRender();
});
sortSelect.addEventListener("change", e => { filters.sort = e.target.value; applyFiltersAndRender(); });
clearFiltersBtn.addEventListener("click", ()=> {
  filters = { q:"", maxPrice:500, category:null, sort:"relevance" };
  searchInput.value = "";
  priceRange.value = 500;
  priceValue.textContent = "$500";
  sortSelect.value = "relevance";
  buildCategoryChips();
  applyFiltersAndRender();
});
refreshBtn.addEventListener("click", ()=> loadData());

/* =========================
   Cart Events
========================= */
checkoutBtn.addEventListener("click", ()=> alert("Checkout flow not implemented. Demo only."));
clearCartBtn.addEventListener("click", ()=> { cart=[]; saveCart(); renderCart(); });

/* =========================
   Helpers
========================= */
function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }
function cap(s){ return s?.charAt(0).toUpperCase() + s?.slice(1); }

/* =========================
   Init
========================= */
loadData();
renderCart();
