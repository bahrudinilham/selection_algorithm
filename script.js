const imageContainer = document.getElementById("image-container");
const shuffleBtn = document.getElementById("shuffleBtn");
const sortBtn = document.getElementById("sortBtn");
const statusDiv = document.getElementById("status");

// Constants

const DELAY_MS = 800; // Slower animation to follow easily

// State
let items = [];
let isSorting = false;

// Initialize with random numbers
function init() {
  imageContainer.innerHTML = "";
  items = []; // Store the visual elements

  const fixedValues = [11, 12, 22, 25, 64];

  // Create boxes for fixed values
  fixedValues.forEach((value) => {
    createBox(value);
  });

  statusDiv.textContent =
    "Numbers loaded. Click Shuffle to randomize positions.";
  sortBtn.disabled = false;
}

function createBox(value) {
  const box = document.createElement("div");
  box.classList.add("strip"); // Reusing class name for simplicity in CSS mapping, implies 'box' now
  box.textContent = value;
  box.dataset.value = value;

  imageContainer.appendChild(box);
  items.push(box);
}

// Simple shuffle to just regenerate random numbers
// True shuffle of existing elements
function shuffle() {
  if (isSorting) return;

  // Get current elements
  const boxes = Array.from(imageContainer.children);

  // Fisher-Yates Shuffle
  for (let i = boxes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
  }

  // Re-append in new order
  imageContainer.innerHTML = "";
  boxes.forEach((box) => {
    // Reset visual state (remove sorted/highlight classes) but keep the box
    box.className = "strip";
    // Reset transforms if any stuck
    box.style.transform = "";
    imageContainer.appendChild(box);
  });

  statusDiv.textContent = "Numbers shuffled (positions changed).";
  sortBtn.disabled = false;
}

// Helpers for async delay
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function selectionSort() {
  if (isSorting) return;
  isSorting = true;
  shuffleBtn.disabled = true;
  sortBtn.disabled = true;
  statusDiv.textContent = "Sorting...";

  // Re-fetch items from DOM to ensure order correctness
  let boxes = Array.from(imageContainer.children);
  const n = boxes.length;

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    // Highlight current start
    boxes[i].classList.add("highlight-current");
    statusDiv.textContent = `Finding minimum starting from index ${i}...`;
    await sleep(DELAY_MS);

    for (let j = i + 1; j < n; j++) {
      // Highlight scanning
      boxes[j].classList.add("highlight-current");
      await sleep(DELAY_MS);

      const valJ = parseInt(boxes[j].textContent);
      const valMin = parseInt(boxes[minIdx].textContent);

      if (valJ < valMin) {
        // Found new min
        if (minIdx !== i) {
          boxes[minIdx].classList.remove("highlight-min");
        }
        minIdx = j;
        boxes[minIdx].classList.add("highlight-min");
        statusDiv.textContent = `New minimum found: ${boxes[minIdx].textContent}`;
        await sleep(DELAY_MS);
      }

      boxes[j].classList.remove("highlight-current");
    }

    // Capture nodes before swap for correct cleanup
    const nodeI = boxes[i];
    const nodeMin = boxes[minIdx];

    // Swap using captured nodes
    if (minIdx !== i) {
      statusDiv.textContent = `Swapping ${nodeI.textContent} and ${nodeMin.textContent}`;
      await swap(nodeI, nodeMin);
      // Refresh local array reference after DOM swap for next iteration logic
      boxes = Array.from(imageContainer.children);
    }

    // Cleanup visuals using captured nodes (which still hold the classes regardless of position)
    nodeI.classList.remove("highlight-current");
    if (minIdx !== i) nodeMin.classList.remove("highlight-min");

    // Mark the element now at position i as sorted
    // After swap, the element at i is nodeMin (if swapped), or nodeI (if not swapped)
    // Since boxes was refreshed, boxes[i] is the correct current element at that position
    // But simpler: the element we want to mark sorted is the one that was determined to be min.
    nodeMin.classList.add("sorted");
  }

  // Mark last one
  boxes[n - 1].classList.add("sorted");
  statusDiv.textContent = "Sorted!";

  // Cleanup sorted class after delay
  setTimeout(() => {
    boxes.forEach((b) => b.classList.remove("sorted"));
    isSorting = false;
    shuffleBtn.disabled = false;
    sortBtn.disabled = false;
  }, 2000);
}

async function swap(nodeA, nodeB) {
  if (nodeA === nodeB) return;

  // 1. Get positions
  const rectA = nodeA.getBoundingClientRect();
  const rectB = nodeB.getBoundingClientRect();
  const distanceX = rectB.left - rectA.left;

  // 2. Define Animations (Up -> Across -> Down)
  // Node A moves to B's position
  const keyframesA = [
    { transform: "translate(0, 0)", zIndex: 100 },
    { transform: "translate(0, -80px)", zIndex: 100, offset: 0.3 }, // Float Up
    { transform: `translate(${distanceX}px, -80px)`, zIndex: 100, offset: 0.7 }, // Move Across
    { transform: `translate(${distanceX}px, 0)`, zIndex: 100 }, // Land Down
  ];

  // Node B moves to A's position
  const keyframesB = [
    { transform: "translate(0, 0)", zIndex: 100 },
    { transform: "translate(0, -80px)", zIndex: 100, offset: 0.3 }, // Float Up
    {
      transform: `translate(${-distanceX}px, -80px)`,
      zIndex: 100,
      offset: 0.7,
    }, // Move Across
    { transform: `translate(${-distanceX}px, 0)`, zIndex: 100 }, // Land Down
  ];

  const options = {
    duration: 1500, // Duration of the swap animation
    easing: "ease-in-out",
    fill: "forwards",
  };

  // 3. Play Animations
  const animA = nodeA.animate(keyframesA, options);
  const animB = nodeB.animate(keyframesB, options);

  await Promise.all([animA.finished, animB.finished]);

  // 4. Actual DOM Swap
  // Use a temporary placeholder to swap safely regardless of adjacency
  const parent = imageContainer;
  const dummy = document.createElement("div");

  // Insert dummy before A
  parent.insertBefore(dummy, nodeA);
  // Move A to before B
  parent.insertBefore(nodeA, nodeB);
  // Move B to before dummy
  parent.insertBefore(nodeB, dummy);
  // Remove dummy
  parent.removeChild(dummy);

  // 5. Clear Animation effects
  // Since DOM is swapped, the elements are structurally in the new positions.
  // We cancel the animation so they don't apply the transform on top of the new position.
  animA.cancel();
  animB.cancel();

  // Brief pause to settle
  await sleep(200);
}

// Listeners
shuffleBtn.addEventListener("click", shuffle);
sortBtn.addEventListener("click", () => selectionSort());

// Start
init();
