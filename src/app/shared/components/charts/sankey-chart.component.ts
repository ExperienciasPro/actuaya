import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChanges,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface SankeyNode {
    id: string;
    label: string;
    color?: string;         // Color del nodo (hex)
    column?: number;        // Columna (0-indexed, se calcula automáticamente si no se provee)
}

export interface SankeyLink {
    source: string;         // ID del nodo origen
    target: string;         // ID del nodo destino
    value: number;          // Cantidad de flujo
    color?: string;         // Color del link (hex, se hereda del source si no se provee)
}

export interface SankeyNodeClickEvent {
    node: SankeyNode;
    totalFlow: number;
}

export interface SankeyLinkClickEvent {
    source: SankeyNode;
    target: SankeyNode;
    value: number;
}

// ─── Tipos internos de layout ────────────────────────────────────────────────

interface LayoutNode {
    id: string;
    label: string;
    color: string;
    column: number;
    x: number;
    y: number;
    width: number;
    height: number;
    totalValue: number;
    sourceLinks: LayoutLink[];
    targetLinks: LayoutLink[];
}

interface LayoutLink {
    source: LayoutNode;
    target: LayoutNode;
    value: number;
    color: string;
    sy: number;   // source y offset
    ty: number;   // target y offset
    width: number; // link thickness
    path: string;  // SVG path
    opacity: number;
}

// ─── Colores predeterminados ─────────────────────────────────────────────────

const NODE_COLORS = [
    '#6366f1', '#3b82f6', '#14b8a6', '#22c55e',
    '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
    '#0ea5e9', '#f97316', '#84cc16', '#06b6d4'
];

const RESULT_COLORS: Record<string, string> = {
    exito: '#22c55e',
    success: '#22c55e',
    fracaso: '#ef4444',
    failure: '#ef4444',
    parcial: '#f59e0b',
    partial: '#f59e0b'
};

@Component({
    selector: 'app-sankey-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="sankey-empty" *ngIf="!nodes || nodes.length === 0 || !links || links.length === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
      <p>Sin flujos de decisión para visualizar</p>
    </div>

    <!-- Sankey Diagram -->
    <div class="sankey-wrapper" *ngIf="nodes && nodes.length > 0 && links && links.length > 0">
      <div class="sankey-svg-container" [style.height]="height" #svgContainer>
        <svg
          [attr.viewBox]="'0 0 ' + svgWidth + ' ' + svgHeight"
          [attr.width]="svgWidth"
          [attr.height]="svgHeight"
          class="sankey-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <!-- Gradientes para los links -->
            <linearGradient
              *ngFor="let link of layoutLinks; let i = index"
              [attr.id]="'linkGrad_' + i"
              gradientUnits="userSpaceOnUse"
              [attr.x1]="link.source.x + link.source.width"
              [attr.y1]="0"
              [attr.x2]="link.target.x"
              [attr.y2]="0"
            >
              <stop offset="0%" [attr.stop-color]="link.source.color" stop-opacity="0.4" />
              <stop offset="100%" [attr.stop-color]="link.target.color" stop-opacity="0.4" />
            </linearGradient>
          </defs>

          <!-- Links -->
          <g class="sankey-links">
            <path
              *ngFor="let link of layoutLinks; let i = index"
              [attr.d]="link.path"
              [attr.fill]="'url(#linkGrad_' + i + ')'"
              [attr.stroke]="'none'"
              [attr.opacity]="link.opacity"
              class="sankey-link"
              (mouseenter)="onLinkHover(i, true)"
              (mouseleave)="onLinkHover(i, false)"
              (click)="onLinkClick(link)"
            >
              <title>{{ link.source.label }} → {{ link.target.label }}: {{ link.value }}</title>
            </path>
          </g>

          <!-- Nodes -->
          <g class="sankey-nodes">
            <g *ngFor="let node of layoutNodes" class="sankey-node-group">
              <rect
                [attr.x]="node.x"
                [attr.y]="node.y"
                [attr.width]="node.width"
                [attr.height]="node.height"
                [attr.fill]="node.color"
                [attr.rx]="4"
                [attr.ry]="4"
                class="sankey-node-rect"
                (click)="onNodeClick(node)"
              >
                <title>{{ node.label }}: {{ node.totalValue }}</title>
              </rect>
              <!-- Label -->
              <text
                [attr.x]="getNodeLabelX(node)"
                [attr.y]="node.y + node.height / 2"
                [attr.text-anchor]="getNodeLabelAnchor(node)"
                dominant-baseline="middle"
                class="sankey-node-label"
              >{{ node.label }}</text>
              <!-- Value badge -->
              <text
                *ngIf="showValues && node.height > 18"
                [attr.x]="node.x + node.width / 2"
                [attr.y]="node.y + node.height / 2"
                text-anchor="middle"
                dominant-baseline="middle"
                class="sankey-node-value"
                [attr.fill]="'#fff'"
              >{{ node.totalValue }}</text>
            </g>
          </g>

          <!-- Column headers -->
          <g class="sankey-headers" *ngIf="columnHeaders.length > 0">
            <text
              *ngFor="let header of columnHeaders; let col = index"
              [attr.x]="getColumnCenterX(col)"
              [attr.y]="14"
              text-anchor="middle"
              class="sankey-header-text"
            >{{ header }}</text>
          </g>
        </svg>
      </div>

      <!-- Flow summary -->
      <div class="sankey-footer" *ngIf="showFooter">
        <span class="flow-stat">
          <strong>{{ nodes.length }}</strong> nodos
        </span>
        <span class="flow-divider">·</span>
        <span class="flow-stat">
          <strong>{{ links.length }}</strong> conexiones
        </span>
        <span class="flow-divider">·</span>
        <span class="flow-stat">
          <strong>{{ totalFlow }}</strong> flujo total
        </span>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .sankey-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .sankey-empty svg { width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
    .sankey-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .sankey-wrapper { width: 100%; }

    .sankey-svg-container {
      width: 100%; overflow-x: auto; overflow-y: hidden;
      border-radius: 12px; background: #fefefe;
    }
    .sankey-svg { display: block; margin: 0 auto; }

    .sankey-link {
      cursor: pointer;
      transition: opacity 0.2s ease;
    }
    .sankey-link:hover { opacity: 0.85 !important; }

    .sankey-node-rect {
      cursor: pointer;
      transition: filter 0.2s ease;
      stroke: rgba(255,255,255,0.6);
      stroke-width: 1;
    }
    .sankey-node-rect:hover {
      filter: brightness(1.1) drop-shadow(0 2px 6px rgba(0,0,0,0.15));
    }

    .sankey-node-label {
      font-size: 11px; font-weight: 600; fill: #334155;
      pointer-events: none;
      text-shadow: 0 0 3px #fff, 0 0 3px #fff;
    }
    .sankey-node-value {
      font-size: 10px; font-weight: 800;
      pointer-events: none;
    }

    .sankey-header-text {
      font-size: 11px; font-weight: 700; fill: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    .sankey-footer {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 14px; font-size: 12px; color: #64748b;
    }
    .flow-stat strong { font-weight: 800; color: #1e293b; }
    .flow-divider { color: #cbd5e1; }
  `]
})
export class SankeyChartComponent implements AfterViewInit, OnChanges, OnDestroy {

    // ── Inputs ──
    @Input() nodes: SankeyNode[] = [];
    @Input() links: SankeyLink[] = [];
    @Input() height: string = '400px';
    @Input() nodeWidth: number = 18;
    @Input() nodePadding: number = 16;
    @Input() showValues: boolean = true;
    @Input() showFooter: boolean = true;
    @Input() columnHeaders: string[] = [];   // e.g. ['Inicio', 'Decisión 1', 'Decisión 2', 'Resultado']

    // ── Outputs ──
    @Output() nodeClicked = new EventEmitter<SankeyNodeClickEvent>();
    @Output() linkClicked = new EventEmitter<SankeyLinkClickEvent>();

    @ViewChild('svgContainer', { static: false }) svgContainerRef!: ElementRef;

    layoutNodes: LayoutNode[] = [];
    layoutLinks: LayoutLink[] = [];
    svgWidth = 800;
    svgHeight = 400;
    totalFlow = 0;

    private resizeObserver: ResizeObserver | null = null;

    ngAfterViewInit(): void {
        this.observeResize();
        setTimeout(() => this.computeLayout(), 0);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['nodes'] || changes['links'] || changes['nodeWidth'] || changes['nodePadding']) {
            setTimeout(() => this.computeLayout(), 0);
        }
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // ── Eventos ──

    onNodeClick(node: LayoutNode): void {
        this.nodeClicked.emit({
            node: { id: node.id, label: node.label, color: node.color },
            totalFlow: node.totalValue
        });
    }

    onLinkClick(link: LayoutLink): void {
        this.linkClicked.emit({
            source: { id: link.source.id, label: link.source.label, color: link.source.color },
            target: { id: link.target.id, label: link.target.label, color: link.target.color },
            value: link.value
        });
    }

    onLinkHover(index: number, isHovering: boolean): void {
        this.layoutLinks.forEach((l, i) => {
            l.opacity = isHovering ? (i === index ? 0.8 : 0.15) : 0.5;
        });
    }

    getNodeLabelX(node: LayoutNode): number {
        const maxCol = Math.max(...this.layoutNodes.map(n => n.column));
        if (node.column === 0) return node.x - 6;
        if (node.column === maxCol) return node.x + node.width + 6;
        return node.x + node.width + 6;
    }

    getNodeLabelAnchor(node: LayoutNode): string {
        if (node.column === 0) return 'end';
        return 'start';
    }

    getColumnCenterX(col: number): number {
        const colNodes = this.layoutNodes.filter(n => n.column === col);
        if (colNodes.length === 0) return 0;
        return colNodes[0].x + this.nodeWidth / 2;
    }

    // ── Layout Engine (Simplified Sankey) ──

    private observeResize(): void {
        if (!this.svgContainerRef) return;
        this.resizeObserver = new ResizeObserver(() => {
            this.computeLayout();
        });
        this.resizeObserver.observe(this.svgContainerRef.nativeElement);
    }

    private computeLayout(): void {
        if (!this.nodes || this.nodes.length === 0 || !this.links || this.links.length === 0) return;

        // Dimensiones
        const containerWidth = this.svgContainerRef?.nativeElement?.offsetWidth || 800;
        const parsedHeight = parseInt(this.height) || 400;
        const margin = { top: 30, right: 120, bottom: 20, left: 120 };

        this.svgWidth = Math.max(containerWidth, 600);
        this.svgHeight = parsedHeight;

        const innerWidth = this.svgWidth - margin.left - margin.right;
        const innerHeight = this.svgHeight - margin.top - margin.bottom;

        // 1. Crear mapa de nodos
        const nodeMap = new Map<string, LayoutNode>();
        this.nodes.forEach((n, i) => {
            nodeMap.set(n.id, {
                id: n.id,
                label: n.label,
                color: n.color || this.resolveNodeColor(n, i),
                column: n.column ?? -1,
                x: 0, y: 0,
                width: this.nodeWidth,
                height: 0,
                totalValue: 0,
                sourceLinks: [],
                targetLinks: []
            });
        });

        // 2. Crear links y calcular flujos
        const lLinks: LayoutLink[] = [];
        this.links.forEach(l => {
            const src = nodeMap.get(l.source);
            const tgt = nodeMap.get(l.target);
            if (!src || !tgt) return;

            const link: LayoutLink = {
                source: src,
                target: tgt,
                value: l.value,
                color: l.color || src.color,
                sy: 0, ty: 0,
                width: 0,
                path: '',
                opacity: 0.5
            };
            src.sourceLinks.push(link);
            tgt.targetLinks.push(link);
            lLinks.push(link);
        });

        // 3. Calcular totalValue por nodo
        nodeMap.forEach(node => {
            const outFlow = node.sourceLinks.reduce((s, l) => s + l.value, 0);
            const inFlow = node.targetLinks.reduce((s, l) => s + l.value, 0);
            node.totalValue = Math.max(outFlow, inFlow);
        });

        this.totalFlow = lLinks.reduce((s, l) => s + l.value, 0);

        // 4. Asignar columnas si no están definidas (BFS topológico)
        const nodesArray = Array.from(nodeMap.values());
        const needsColumns = nodesArray.some(n => n.column === -1);
        if (needsColumns) {
            this.assignColumns(nodesArray);
        }

        // 5. Calcular posiciones X
        const numColumns = Math.max(...nodesArray.map(n => n.column)) + 1;
        const columnGap = numColumns > 1 ? innerWidth / (numColumns - 1) : 0;

        nodesArray.forEach(node => {
            node.x = margin.left + node.column * columnGap;
        });

        // 6. Calcular alturas de nodos (proporcional al flujo)
        const maxFlow = Math.max(...nodesArray.map(n => n.totalValue), 1);
        const minNodeHeight = 8;

        nodesArray.forEach(node => {
            node.height = Math.max(
                (node.totalValue / maxFlow) * (innerHeight * 0.7),
                minNodeHeight
            );
        });

        // 7. Posicionar verticalmente por columna
        for (let col = 0; col < numColumns; col++) {
            const colNodes = nodesArray.filter(n => n.column === col);
            // Ordenar por totalValue descendiente
            colNodes.sort((a, b) => b.totalValue - a.totalValue);

            const totalHeight = colNodes.reduce((s, n) => s + n.height, 0);
            const totalPadding = (colNodes.length - 1) * this.nodePadding;
            let startY = margin.top + (innerHeight - totalHeight - totalPadding) / 2;

            colNodes.forEach(node => {
                node.y = Math.max(startY, margin.top);
                startY += node.height + this.nodePadding;
            });
        }

        // 8. Calcular posiciones Y de los links y generar paths
        // Ordenar links por posición de origen para evitar cruces
        nodesArray.forEach(node => {
            let syOffset = 0;
            node.sourceLinks.sort((a, b) => a.target.y - b.target.y);
            node.sourceLinks.forEach(link => {
                link.width = node.totalValue > 0
                    ? (link.value / node.totalValue) * node.height
                    : 0;
                link.sy = node.y + syOffset;
                syOffset += link.width;
            });

            let tyOffset = 0;
            node.targetLinks.sort((a, b) => a.source.y - b.source.y);
            node.targetLinks.forEach(link => {
                link.ty = node.y + tyOffset;
                tyOffset += link.width;
            });
        });

        // 9. Generar SVG paths (curvas bezier)
        lLinks.forEach(link => {
            const x0 = link.source.x + link.source.width;
            const x1 = link.target.x;
            const xi = (x0 + x1) / 2;

            const y0top = link.sy;
            const y0bot = link.sy + link.width;
            const y1top = link.ty;
            const y1bot = link.ty + link.width;

            link.path = `
        M ${x0},${y0top}
        C ${xi},${y0top} ${xi},${y1top} ${x1},${y1top}
        L ${x1},${y1bot}
        C ${xi},${y1bot} ${xi},${y0bot} ${x0},${y0bot}
        Z
      `;
        });

        this.layoutNodes = nodesArray;
        this.layoutLinks = lLinks;
    }

    // ── Asignación automática de columnas (BFS) ──

    private assignColumns(nodes: LayoutNode[]): void {
        // Nodos sin entradas van a columna 0
        const visited = new Set<string>();
        const queue: LayoutNode[] = [];

        nodes.forEach(n => {
            if (n.targetLinks.length === 0) {
                n.column = 0;
                visited.add(n.id);
                queue.push(n);
            }
        });

        // BFS
        while (queue.length > 0) {
            const current = queue.shift()!;
            current.sourceLinks.forEach(link => {
                const target = link.target;
                if (!visited.has(target.id)) {
                    target.column = current.column + 1;
                    visited.add(target.id);
                    queue.push(target);
                }
            });
        }

        // Nodos sin asignar → última columna
        const maxCol = Math.max(...nodes.filter(n => n.column >= 0).map(n => n.column), 0);
        nodes.forEach(n => {
            if (n.column < 0) n.column = maxCol + 1;
        });
    }

    // ── Resolver color de nodo ──

    private resolveNodeColor(node: SankeyNode, index: number): string {
        const lowerLabel = node.label.toLowerCase();
        for (const [key, color] of Object.entries(RESULT_COLORS)) {
            if (lowerLabel.includes(key)) return color;
        }
        return NODE_COLORS[index % NODE_COLORS.length];
    }
}
