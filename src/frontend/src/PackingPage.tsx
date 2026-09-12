import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Box,
  ClipboardList,
  Eye,
  PackageCheck,
  Ruler,
  Scale,
} from "lucide-react";
import { boxCatalog, itemCatalog, packingResult } from "./data/mockPackingPlans";
import type { BackendPackingResult, Dimensions, PackedContainer, PackingItem, Point3D } from "./types";
import "./packing.css";

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

function getVolume({ width, depth, height }: Dimensions) {
  return width * depth * height;
}

function getWeight(items: PackingItem[]) {
  return items.reduce((sum, item) => sum + item.mass, 0);
}

function normalizePackingResult(result: BackendPackingResult): PackedContainer[] {
  return result.containers.map((container, containerIndex): PackedContainer => {
    const box = boxCatalog[container.box_type] ?? Object.values(boxCatalog)[0];
    const boxDimensions = {
      width: box.x,
      depth: box.y,
      height: box.z,
    };
    const zLevels = [...new Set(container.placements.map((placement) => placement.z))].sort((a, b) => a - b);

    const items = container.placements.map((placement, itemIndex): PackingItem => {
      const product = itemCatalog[placement.item_id] ?? {
        id: placement.item_id,
        destination: "Пункт назначения не указан",
        x: 80,
        y: 80,
        z: 80,
        mass: 0,
        stackable: true,
      };
      const dimensions = {
        width: product.x,
        depth: product.y,
        height: product.z,
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
  onSelect,
}: {
  item: PackingItem;
  active: boolean;
  falling?: boolean;
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
      <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" className="iso-label">
        {item.id}
      </text>
    </g>
  );
}

function IsoBoxView({
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
  const box = getCorners({ x: 0, y: 0, z: 0 }, container.box.dimensions);
  const viewBox = getSvgViewBox(container.box.dimensions);
  const itemOrder = new Map(container.items.map((item, index) => [item.id, index]));
  const fallingItem = placementStep < container.items.length ? container.items[placementStep] : null;
  const sortedItems = [...container.items].sort((a, b) => {
    const depthDelta = getIsoPaintDepth(a) - getIsoPaintDepth(b);
    if (depthDelta !== 0) {
      return depthDelta;
    }

    return a.position.z - b.position.z;
  });
  const visibleItems = sortedItems.filter((item) => {
    const itemIndex = itemOrder.get(item.id) ?? 0;
    return itemIndex < placementStep || placementStep >= container.items.length;
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
          onSelect={() => onSelectItem(item.id)}
        />
      ))}

      {fallingItem && (
        <IsoCuboid
          key={`falling-${fallingItem.id}-${placementStep}`}
          item={fallingItem}
          active
          falling
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
  onSelectItem,
}: {
  container: PackedContainer;
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
}) {
  return (
    <aside className="panel items-panel" aria-label="Позиции заказа">
      <div className="panel-heading">
        <span className="heading-icon">
          <ClipboardList size={18} />
        </span>
        <div>
          <h2>Позиции</h2>
          <p>{container.items.length} мест в коробке</p>
        </div>
      </div>

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
              <strong>{item.id}</strong>
              <span>{formatDimensions(item.dimensions)} · {item.mass.toFixed(1)} кг</span>
              <span>{item.destination}</span>
              <span>Слой {item.layer}</span>
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
  return (
    <div className="box-menu" aria-label="Коробки заказа">
      <div className="panel-heading">
        <span className="heading-icon">
          <Box size={18} />
        </span>
        <div>
          <h2>Коробки</h2>
          <p>{containers.length} в упаковке</p>
        </div>
      </div>

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
                <strong>{container.boxType}</strong>
                <span>{container.items.length} товаров · {Math.round(container.fillRate * 100)}%</span>
                <span>{boxWeight.toFixed(1)} / {container.box.maxMass} кг</span>
                <span>{formatDimensions(container.box.dimensions)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PackingPage() {
  const containers = useMemo(() => normalizePackingResult(packingResult), []);
  const [selectedContainerId, setSelectedContainerId] = useState(containers[0]?.id ?? "");
  const selectedContainer = useMemo(
    () => containers.find((container) => container.id === selectedContainerId) ?? containers[0],
    [containers, selectedContainerId],
  );
  const [activeItemId, setActiveItemId] = useState(selectedContainer?.items[0]?.id ?? "");
  const [placementStep, setPlacementStep] = useState(selectedContainer?.items.length ?? 0);

  const activeItem = selectedContainer.items.find((item) => item.id === activeItemId) ?? selectedContainer.items[0];
  const totalWeight = getWeight(selectedContainer.items);

  useEffect(() => {
    setActiveItemId(selectedContainer.items[0]?.id ?? "");
    setPlacementStep(selectedContainer.items.length);
  }, [selectedContainer.id, selectedContainer.items]);

  useEffect(() => {
    if (placementStep < selectedContainer.items.length) {
      setActiveItemId(selectedContainer.items[placementStep].id);
    }
  }, [placementStep, selectedContainer.items]);

  const selectItem = (itemId: string) => {
    const selectedIndex = selectedContainer.items.findIndex((item) => item.id === itemId);
    if (selectedIndex >= 0) {
      setPlacementStep(selectedIndex);
    }
    setActiveItemId(itemId);
  };

  const selectContainer = (containerId: string) => {
    setSelectedContainerId(containerId);
  };

  return (
    <main className="app-shell app-theme theme-ozon">
      <header className="topbar">
        <div className="brand-block">
          <div>
            <h1>Алгоритм упаковки</h1>
          </div>
        </div>
      </header>

      <section className="summary-strip" aria-label="Сводка коробки">
        <Metric icon={<Box size={18} />} label="Выбрана" value={`Коробка ${selectedContainer.index} · ${selectedContainer.boxType}`} />
        <Metric icon={<Ruler size={18} />} label="Габариты" value={formatDimensions(selectedContainer.box.dimensions)} />
        <Metric icon={<Scale size={18} />} label="Вес" value={`${totalWeight.toFixed(1)} / ${selectedContainer.box.maxMass} кг`} />
        <Metric icon={<PackageCheck size={18} />} label="Заполнение" value={`${Math.round(selectedContainer.fillRate * 100)}%`} />
      </section>

      <section className="workspace-grid">
        <ItemList container={selectedContainer} activeItemId={activeItem.id} onSelectItem={selectItem} />

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
          </div>

          <div className="visual-stage">
            <IsoBoxView
              container={selectedContainer}
              activeItemId={activeItem.id}
              placementStep={placementStep}
              onSelectItem={selectItem}
            />
          </div>
        </section>

        <aside className="panel box-menu-panel">
          <BoxMenu
            containers={containers}
            selectedContainerId={selectedContainer.id}
            onSelectContainer={selectContainer}
          />
        </aside>
      </section>
    </main>
  );
}

export default PackingPage;
