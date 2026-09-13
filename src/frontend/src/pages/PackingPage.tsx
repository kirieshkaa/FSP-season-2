import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  PackageCheck,
  Ruler,
  Scale,
} from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { boxesApi } from "../api/boxes";
import { productsApi } from "../api/products";
import { mathModelApi, type SolveResponse } from "../api/mathModel";
import { ApiError } from "../api/client";
import type { BackendBox, BackendPackingResult, BackendProduct, Dimensions, PackedContainer, PackingItem, Point3D } from "../data/packingTypes";

type ScreenPoint = {
  x: number;
  y: number;
};

const ISO_X = 0.866;
const ISO_Y = 0.5;
const ISO_Z = 0.78;
const ITEM_COLORS = ["#2F80ED", "#F2994A", "#27AE60", "#9B51E0", "#EB5757", "#56CCF2", "#006D77"];

function formatMm(value: number) {
  return `${Math.round(value)} мм`;
}

function formatDimensions({ width, depth, height }: Dimensions) {
  return `${formatMm(width)} x ${formatMm(depth)} x ${formatMm(height)}`;
}

function fmtCoord(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function getVolume({ width, depth, height }: Dimensions) {
  return width * depth * height;
}

function getWeight(items: PackingItem[]) {
  return items.reduce((sum, item) => sum + item.mass, 0);
}

function normalizePackingResult(
  result: BackendPackingResult,
  boxCatalog: Record<string, BackendBox>,
  itemCatalog: Record<string, BackendProduct>,
): PackedContainer[] {
  return result.containers.map((container, containerIndex): PackedContainer => {
    const box = boxCatalog[container.box_type] ?? Object.values(boxCatalog)[0];
    const boxDimensions = {
      width: box.x,
      depth: box.y,
      height: box.z,
    };
    const zLevels = [...new Set(container.placements.map((placement) => placement.z))].sort((a, b) => a - b);

    const items = container.placements.map((placement, itemIndex): PackingItem => {
      const baseItemId = placement.item_id.split("#")[0];
      const product = itemCatalog[baseItemId] ?? {
        id: placement.item_id,
        name: baseItemId,
        destination: "Пункт назначения не указан",
        x: 80,
        y: 80,
        z: 80,
        mass: 0,
        stackable: true,
        quantity: 1,
      };
      const dims: Record<string, number> = { L: product.x, W: product.y, H: product.z };
      // Packvium orientation is an axis order like "LWH"/"HLW": the first
      // code maps to X (width), second to Y (depth), third to Z (height).
      const [a, b, c] = (placement.orientation || "LWH").split("");
      const dimensions = {
        width: dims[a],
        depth: dims[b],
        height: dims[c],
      };

      return {
        ...product,
        id: placement.item_id,
        dimensions,
        position: {
          x: placement.x,
          y: placement.y,
          z: placement.z,
        },
        color: ITEM_COLORS[itemIndex % ITEM_COLORS.length],
        layer: Math.max(1, zLevels.indexOf(placement.z) + 1),
        orientation: placement.orientation,
      };
    });

    const usedVolume = items.reduce((sum, item) => sum + getVolume(item.dimensions), 0);
    const fillRate = usedVolume / getVolume(boxDimensions);

    return {
      id: `container-${containerIndex + 1}`,
      index: containerIndex + 1,
      boxType: container.box_type,
      boxName: box.name ?? container.box_type,
      box: {
        dimensions: boxDimensions,
        maxMass: box.maxMass,
      },
      items,
      fillRate,
    };
  });
}

function projectPoint(point: Point3D): ScreenPoint {
  return {
    x: (point.x - point.y) * ISO_X,
    y: (point.x + point.y) * ISO_Y - point.z * ISO_Z,
  };
}

function getCorners(origin: Point3D, dimensions: Dimensions) {
  const { x, y, z } = origin;
  const { width, depth, height } = dimensions;

  return {
    p000: projectPoint({ x, y, z }),
    p100: projectPoint({ x: x + width, y, z }),
    p010: projectPoint({ x, y: y + depth, z }),
    p110: projectPoint({ x: x + width, y: y + depth, z }),
    p001: projectPoint({ x, y, z: z + height }),
    p101: projectPoint({ x: x + width, y, z: z + height }),
    p011: projectPoint({ x, y: y + depth, z: z + height }),
    p111: projectPoint({ x: x + width, y: y + depth, z: z + height }),
  };
}

function pointsToString(points: ScreenPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function shadeColor(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  const numeric = Number.parseInt(normalized, 16);
  const delta = Math.round(255 * (amount / 100));
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, ((numeric >> shift) & 255) + delta));

  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function getSvgViewBox(boxDimensions: Dimensions) {
  const box = getCorners({ x: 0, y: 0, z: 0 }, boxDimensions);
  const points = Object.values(box);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const padding = 80;

  return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${
    maxY - minY + padding * 2
  }`;
}

function getIsoPaintDepth(item: PackingItem) {
  return item.position.x + item.position.y + (item.dimensions.width + item.dimensions.depth) / 2;
}

function IsoCuboid({
  item,
  active,
  falling,
  showLabel,
  onSelect,
}: {
  item: PackingItem;
  active: boolean;
  falling?: boolean;
  showLabel: boolean;
  onSelect: () => void;
}) {
  const c = getCorners(item.position, item.dimensions);
  const labelPoint = projectPoint({
    x: item.position.x + item.dimensions.width / 2,
    y: item.position.y + item.dimensions.depth / 2,
    z: item.position.z + item.dimensions.height + 18,
  });
  const classes = ["iso-item", active ? "is-active" : "", falling ? "is-falling" : ""]
    .filter(Boolean)
    .join(" ");
  const label = item.name.length > 22 ? `${item.name.slice(0, 22)}…` : item.name;

  return (
    <g className={classes} onClick={onSelect} role="button" tabIndex={0}>
      <polygon
        points={pointsToString([c.p100, c.p110, c.p111, c.p101])}
        fill={shadeColor(item.color, -22)}
      />
      <polygon
        points={pointsToString([c.p010, c.p110, c.p111, c.p011])}
        fill={shadeColor(item.color, -34)}
      />
      <polygon
        points={pointsToString([c.p001, c.p101, c.p111, c.p011])}
        fill={shadeColor(item.color, 12)}
      />
      <polyline
        points={pointsToString([c.p001, c.p101, c.p111, c.p011, c.p001])}
        className="iso-item-topline"
      />
      {showLabel && (
        <text
          x={labelPoint.x}
          y={labelPoint.y}
          textAnchor="middle"
          className="iso-label"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function IsoBoxView({
  container,
  activeItemId,
  placementStep,
  showLabel,
  onSelectItem,
}: {
  container: PackedContainer;
  activeItemId: string;
  placementStep: number;
  showLabel: boolean;
  onSelectItem: (itemId: string) => void;
}) {
  const box = getCorners({ x: 0, y: 0, z: 0 }, container.box.dimensions);
  const viewBox = getSvgViewBox(container.box.dimensions);
  const itemOrder = new Map(container.items.map((item, index) => [item.id, index]));
  const fallingItem =
    placementStep > 1 && placementStep <= container.items.length
      ? container.items[placementStep - 2]
      : null;
  const fallingIndex = fallingItem ? itemOrder.get(fallingItem.id) ?? -1 : -1;
  const sortedItems = [...container.items].sort((a, b) => {
    const depthDelta = getIsoPaintDepth(a) - getIsoPaintDepth(b);
    if (depthDelta !== 0) {
      return depthDelta;
    }

    return a.position.z - b.position.z;
  });
  const visibleItems = sortedItems.filter((item) => {
    const itemIndex = itemOrder.get(item.id) ?? 0;
    return itemIndex !== fallingIndex && itemIndex < placementStep - 1;
  });

  return (
    <svg className="iso-scene" viewBox={viewBox} aria-label="Изометрическая схема упаковки">
      <polygon
        className="box-floor"
        points={pointsToString([box.p000, box.p100, box.p110, box.p010])}
      />
      <polygon
        className="box-wall"
        points={pointsToString([box.p000, box.p100, box.p101, box.p001])}
      />
      <polygon
        className="box-wall box-wall-side"
        points={pointsToString([box.p000, box.p010, box.p011, box.p001])}
      />

      {visibleItems.map((item) => (
        <IsoCuboid
          key={item.id}
          item={item}
          active={item.id === activeItemId}
          showLabel={showLabel}
          onSelect={() => onSelectItem(item.id)}
        />
      ))}

      {fallingItem && (
        <IsoCuboid
          key={`falling-${fallingItem.id}-${placementStep}`}
          item={fallingItem}
          active
          falling
          showLabel={showLabel}
          onSelect={() => onSelectItem(fallingItem.id)}
        />
      )}

      <g className="box-wireframe">
        {[
          [box.p000, box.p100],
          [box.p100, box.p110],
          [box.p110, box.p010],
          [box.p010, box.p000],
          [box.p001, box.p101],
          [box.p101, box.p111],
          [box.p111, box.p011],
          [box.p011, box.p001],
          [box.p000, box.p001],
          [box.p100, box.p101],
          [box.p110, box.p111],
          [box.p010, box.p011],
        ].map((edge, index) => (
          <line
            key={index}
            x1={edge[0].x}
            y1={edge[0].y}
            x2={edge[1].x}
            y2={edge[1].y}
          />
        ))}
      </g>
    </svg>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>
      <span>
        <span className="metric-label">{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function ItemList({
  container,
  activeItemId,
  placementStep,
  onSelectItem,
}: {
  container: PackedContainer;
  activeItemId: string;
  placementStep: number;
  onSelectItem: (itemId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const current =
    placementStep >= 2 ? container.items[Math.min(container.items.length - 1, placementStep - 2)] : null;

  return (
    <aside className={`items-panel${collapsed ? " is-collapsed" : ""}`} aria-label="Позиции заказа">
      {current && (
        <div className="step-product" aria-label="Продукт текущего шага">
          <span className="step-product-swatch" style={{ backgroundColor: current.color }} />
          <div className="step-product-copy">
            <strong>{current.name}</strong>
            <span>
              {formatDimensions(current.dimensions)} ·{" "}
              {current.mass < 1000 ? `${current.mass.toFixed(0)} г` : `${(current.mass / 1000).toFixed(1)} кг`}
            </span>
            <span>{current.destination}</span>
            <span className="step-product-meta">Слой {current.layer}</span>
            <span className="item-coords">
              x {fmtCoord(current.position.x)} · y {fmtCoord(current.position.y)} · z {fmtCoord(current.position.z)} мм
            </span>
            {!current.stackable && (
              <span className="item-warning">
                <AlertTriangle size={15} />
                Не ставить сверху
              </span>
            )}
          </div>
        </div>
      )}

      <div className="items-card">
        <button
          type="button"
          className="items-heading"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className="heading-icon">
            <ClipboardList size={18} />
          </span>
          <span className="heading-copy">
            <h2>Позиции</h2>
            <span className="heading-sub">{container.items.length} мест в коробке</span>
          </span>
          <ChevronDown size={16} className={`items-chevron${collapsed ? "" : " is-open"}`} />
        </button>

        {!collapsed && (
          <div className="item-list">
            {container.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`item-row ${item.id === activeItemId ? "is-active" : ""}`}
                onClick={() => onSelectItem(item.id)}
              >
                <span className="item-swatch" style={{ backgroundColor: item.color }} />
                <span className="item-copy">
                  <strong>{item.name}</strong>
                  <span>{formatDimensions(item.dimensions)} · {item.mass < 1000 ? `${item.mass.toFixed(0)} г` : `${(item.mass / 1000).toFixed(1)} кг`}</span>
                  <span>{item.destination}</span>
                  <span>Слой {item.layer}</span>
                  <span className="item-coords">
                    x {fmtCoord(item.position.x)} · y {fmtCoord(item.position.y)} · z {fmtCoord(item.position.z)} мм
                  </span>
                </span>
                {!item.stackable && (
                  <span className="item-warning">
                    <AlertTriangle size={15} />
                    Не ставить сверху
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function BoxMenu({
  containers,
  selectedContainerId,
  onSelectContainer,
}: {
  containers: PackedContainer[];
  selectedContainerId: string;
  onSelectContainer: (containerId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const selectedBox = containers.find((c) => c.id === selectedContainerId) ?? null;

  return (
    <div className={`box-menu-panel${collapsed ? " is-collapsed" : ""}`} aria-label="Коробки заказа">
      <div className="box-card">
        {selectedBox && (
          <div className="selected-box" aria-label="Выбранная коробка">
            <span className="selected-box-index">{selectedBox.index}</span>
            <div className="selected-box-copy">
              <strong>{selectedBox.boxName}</strong>
              <span>{selectedBox.items.length} товаров</span>
              <span>
                {(getWeight(selectedBox.items) / 1000).toFixed(1)} / {(selectedBox.box.maxMass / 1000).toFixed(0)} кг (
                {Math.round(selectedBox.fillRate * 100)}%)
              </span>
              <span>{formatDimensions(selectedBox.box.dimensions)}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="items-heading"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className="heading-icon">
            <Box size={18} />
          </span>
          <span className="heading-copy">
            <h2>Коробки</h2>
            <span className="heading-sub">{containers.length} в упаковке</span>
          </span>
          <ChevronDown size={16} className={`items-chevron${collapsed ? "" : " is-open"}`} />
        </button>

        {!collapsed && (
          <div className="box-list">
            {containers.map((container) => {
              const boxWeight = getWeight(container.items);

              return (
                <button
                  type="button"
                  key={container.id}
                  className={`box-row ${container.id === selectedContainerId ? "is-active" : ""}`}
                  onClick={() => onSelectContainer(container.id)}
                >
                  <span className="box-index">{container.index}</span>
                  <span className="box-copy">
                    <strong title={container.boxType}>{container.boxName}</strong>
                    <span>{container.items.length} товаров</span>
                    <span>
                      {(boxWeight / 1000).toFixed(1)} / {(container.box.maxMass / 1000).toFixed(0)} кг (
                      {Math.round(container.fillRate * 100)}%)
                    </span>
                    <span>{formatDimensions(container.box.dimensions)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PackingPage() {
  const [containers, setContainers] = useState<PackedContainer[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [selectedSkus] = useState<string[] | null>(() => {
    try {
      const raw = localStorage.getItem("pack-selection");
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : null;
    } catch {
      return null;
    }
  });
  const [solverProfile, setSolverProfile] = useState<"fast" | "balanced" | "quality">("fast");
  const [timeLimitMs, setTimeLimitMs] = useState(20000);
  const [draftProfile, setDraftProfile] = useState<"fast" | "balanced" | "quality">("fast");
  const [draftTime, setDraftTime] = useState(20000);

  const load = useCallback(
    async (profile: "fast" | "balanced" | "quality" = solverProfile, time = timeLimitMs) => {
    setLoading(true);
    setError("");
    try {
      const [boxPage, productPage] = await Promise.all([
        boxesApi.list({ page: 1, limit: 100 }),
        productsApi.list({ page: 1, limit: 100 }),
      ]);

      const boxCatalog: Record<string, BackendBox> = {};
      const solverBoxes: Record<string, { width: number; height: number; depth: number; max_weight: number; wear_rate: number; count: number }> = {};
      boxPage.items.forEach((box) => {
        boxCatalog[box.id] = {
          box_type: box.id,
          name: box.name,
          x: box.width,
          y: box.height,
          z: box.depth,
          maxMass: box.max_weight,
        };
        solverBoxes[box.id] = {
          width: box.width,
          height: box.height,
          depth: box.depth,
          max_weight: box.max_weight,
          wear_rate: box.wear_rate,
          count: Math.max(1, box.available_count),
        };
      });

      const packedProducts =
        selectedSkus && selectedSkus.length > 0
          ? productPage.items.filter((product) => selectedSkus.includes(product.id))
          : productPage.items;

      const itemCatalog: Record<string, BackendProduct> = {};
      const solverItems = packedProducts.map((product) => {
        itemCatalog[product.id] = {
id: product.id,
        name: product.name,
        destination: product.destination,
        x: product.x,
        y: product.y,
        z: product.z,
        mass: product.weight,
        stackable: product.is_stackable,
        quantity: product.quantity,
      };
        return {
          id: product.id,
          name: product.name,
          x: product.x,
          y: product.y,
          z: product.z,
          weight: product.weight,
          quantity: product.quantity,
          is_stackable: product.is_stackable,
        };
      });

      if (solverItems.length === 0 || Object.keys(solverBoxes).length === 0) {
        setContainers([]);
        setError("Недостаточно данных: нужны товары и коробки на складе");
        return;
      }

      const response: SolveResponse = await mathModelApi.solve({
        items: solverItems,
        boxes: solverBoxes,
        solver_profile: profile,
        time_limit_ms: time,
      });

      if (response.containers.length > 0) {
        setContainers(normalizePackingResult(response, boxCatalog, itemCatalog));
        setSelectedContainerId("container-1");
      } else {
        setContainers([]);
        setError(
          response.unpacked.length > 0
            ? `Не удалось упаковать ${response.unpacked.length} товар(ов)`
            : "Решение не найдено",
        );
      }
    } catch (err) {
      setContainers([]);
      if (err instanceof ApiError && err.status === 409) {
        const detail = err.detail as SolveResponse | undefined;
        const unpacked = detail?.unpacked?.length ?? 0;
        setError(unpacked > 0 ? `Не удалось упаковать ${unpacked} товар(ов)` : "Решение не найдено");
      } else {
        setError(err instanceof ApiError ? err.message : "Не удалось рассчитать упаковку");
      }
    } finally {
      setLoading(false);
    }
  },
    [selectedSkus],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedContainer = useMemo(
    () => containers.find((container) => container.id === selectedContainerId) ?? containers[0],
    [containers, selectedContainerId],
  );
  const [activeItemId, setActiveItemId] = useState("");
  const [placementStep, setPlacementStep] = useState(1);
  const [showLabels, setShowLabels] = useState(false);

  const activeItem = selectedContainer?.items.find((item) => item.id === activeItemId) ?? selectedContainer?.items[0];
  const totalWeight = selectedContainer ? getWeight(selectedContainer.items) : 0;

  useEffect(() => {
    if (!selectedContainer) return;
    setActiveItemId(selectedContainer.items[0]?.id ?? "");
    setPlacementStep(1);
  }, [selectedContainer]);

  useEffect(() => {
    if (selectedContainer && placementStep >= 2) {
      setActiveItemId(selectedContainer.items[Math.min(selectedContainer.items.length - 1, placementStep - 2)].id);
    }
  }, [placementStep, selectedContainer]);

  const selectItem = (itemId: string) => {
    if (!selectedContainer) return;
    const selectedIndex = selectedContainer.items.findIndex((item) => item.id === itemId);
    if (selectedIndex >= 0) {
      setPlacementStep(selectedIndex + 2);
    }
    setActiveItemId(itemId);
  };

  const selectContainer = (containerId: string) => {
    setSelectedContainerId(containerId);
  };

  if (loading) {
    return (
      <div className="content content-single">
        <div className="solve-pop">
          <section className="panel">
            <div className="spinner" aria-hidden="true" />
            <h2 className="panel-title">Расчёт упаковки…</h2>
            <p className="panel-sub">Ищем оптимальное размещение по коробкам</p>
          </section>
        </div>
      </div>
    );
  }

  if (!selectedContainer) {
    return (
      <div className="content content-single">
        <div className="solve-pop">
          <section className="panel">
            <div className="pop-icon" aria-hidden="true">
              <AlertTriangle size={26} />
            </div>
            <h2 className="panel-title">Алгоритм упаковки</h2>
            <p className="panel-sub">{error || "Нет данных для расчёта"}</p>
            <div className="solve-controls pop-solve-controls">
              <label className="solve-field">
                <span className="solve-label">Алгоритм</span>
                <select
                  className="solve-select"
                  value={draftProfile}
                  onChange={(e) => setDraftProfile(e.target.value as "fast" | "balanced" | "quality")}
                >
                  <option value="fast">Fast</option>
                  <option value="balanced">Balanced</option>
                  <option value="quality">Quality</option>
                </select>
              </label>
              <label className="solve-field">
                <span className="solve-label">Лимит</span>
                <select
                  className="solve-select"
                  value={draftTime}
                  onChange={(e) => setDraftTime(Number(e.target.value))}
                >
                  <option value={5000}>5 с</option>
                  <option value={10000}>10 с</option>
                  <option value={20000}>20 с</option>
                  <option value={60000}>60 с</option>
                </select>
              </label>
            </div>
            <div className="pop-actions">
              <button className="btn-secondary btn-sm" onClick={() => navigate("/dashboard")}>
                Вернуться
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  setSolverProfile(draftProfile);
                  setTimeLimitMs(draftTime);
                  void load(draftProfile, draftTime);
                }}
              >
                Пересчитать
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="packing-shell app-theme">
      {error && <div className="toast">{error}</div>}

      <section className="summary-strip" aria-label="Сводка коробки">
        <Metric icon={<Box size={18} />} label="Выбрана" value={`Коробка ${selectedContainer.index} · ${selectedContainer.boxName}`} />
        <Metric icon={<Ruler size={18} />} label="Габариты" value={formatDimensions(selectedContainer.box.dimensions)} />
        <Metric icon={<Scale size={18} />} label="Вес" value={`${(totalWeight / 1000).toFixed(1)} / ${(selectedContainer.box.maxMass / 1000).toFixed(0)} кг`} />
        <Metric icon={<PackageCheck size={18} />} label="Заполнение" value={`${Math.round(selectedContainer.fillRate * 100)}%`} />
      </section>

      <section className="workspace-grid">
        <ItemList
          container={selectedContainer}
          activeItemId={activeItem?.id ?? ""}
          placementStep={placementStep}
          onSelectItem={selectItem}
        />

        <section className="panel visual-panel" aria-label="Схема упаковки">
          <div className="visual-toolbar">
            <div className="panel-heading">
              <span className="heading-icon">
                <Eye size={18} />
              </span>
              <div>
                <h2>Схема</h2>
                <p>Коробка {selectedContainer.index} · {Math.round(selectedContainer.fillRate * 100)}% объема</p>
              </div>
            </div>
            <div className="step-controls">
              <button
                type="button"
                className="step-btn"
                disabled={placementStep <= 1}
                onClick={() => setPlacementStep((s) => Math.max(1, s - 1))}
                aria-label="Предыдущий шаг"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="step-count">
                Шаг {placementStep}/{selectedContainer.items.length + 1}
              </span>
              <button
                type="button"
                className="step-btn"
                disabled={placementStep >= selectedContainer.items.length + 1}
                onClick={() => setPlacementStep((s) => Math.min(selectedContainer.items.length + 1, s + 1))}
                aria-label="Следующий шаг"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <label className="label-toggle">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              <span className="toggle-track" aria-hidden="true" />
              <span>Названия</span>
            </label>
          </div>

          <div className="visual-stage">
            <IsoBoxView
              container={selectedContainer}
              activeItemId={activeItem?.id ?? ""}
              placementStep={placementStep}
              showLabel={showLabels}
              onSelectItem={selectItem}
            />
          </div>
        </section>

        <aside className="box-menu-panel">
          <BoxMenu
            containers={containers}
            selectedContainerId={selectedContainer.id}
            onSelectContainer={selectContainer}
          />
        </aside>
      </section>
    </div>
  );
}

export default PackingPage;
