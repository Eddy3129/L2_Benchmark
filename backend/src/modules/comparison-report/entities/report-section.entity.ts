import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ComparisonReport } from './comparison-report.entity';

export enum SectionType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  COST_ANALYSIS = 'cost_analysis',
  NETWORK_COMPARISON = 'network_comparison',
  GAS_OPTIMIZATION = 'gas_optimization',
  SECURITY_ANALYSIS = 'security_analysis',
  RECOMMENDATIONS = 'recommendations',
  TECHNICAL_DETAILS = 'technical_details',
  CHARTS_AND_GRAPHS = 'charts_and_graphs',
  APPENDIX = 'appendix',
  CUSTOM = 'custom',
}

export enum ContentFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PLAIN_TEXT = 'plain_text',
  JSON = 'json',
}

@Entity('report_sections')
@Index(['reportId', 'sectionType'])
@Index(['orderIndex'])
export class ReportSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reportId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: SectionType,
    default: SectionType.CUSTOM,
  })
  sectionType: SectionType;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: ContentFormat,
    default: ContentFormat.MARKDOWN,
  })
  contentFormat: ContentFormat;

  @Column({ type: 'jsonb', nullable: true })
  chartData?: {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
    data: any;
    options?: any;
    title?: string;
    description?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  tableData?: {
    headers: string[];
    rows: any[][];
    caption?: string;
    styling?: {
      headerStyle?: Record<string, any>;
      rowStyle?: Record<string, any>;
      cellStyle?: Record<string, any>;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    tags?: string[];
    importance?: 'low' | 'medium' | 'high' | 'critical';
    visibility?: 'public' | 'internal' | 'confidential';
    lastModifiedBy?: string;
    version?: string;
    customFields?: Record<string, any>;
  };

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'boolean', default: false })
  isCollapsible: boolean;

  @Column({ type: 'boolean', default: false })
  isCollapsed: boolean;

  @ManyToOne(() => ComparisonReport, (report) => report.sections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportId' })
  report: ComparisonReport;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get hasChartData(): boolean {
    return !!this.chartData;
  }

  get hasTableData(): boolean {
    return !!this.tableData;
  }

  get contentLength(): number {
    return this.content?.length || 0;
  }

  get isExecutiveSummary(): boolean {
    return this.sectionType === SectionType.EXECUTIVE_SUMMARY;
  }

  get isCostAnalysis(): boolean {
    return this.sectionType === SectionType.COST_ANALYSIS;
  }

  get isRecommendations(): boolean {
    return this.sectionType === SectionType.RECOMMENDATIONS;
  }

  get importance(): string {
    return this.metadata?.importance || 'medium';
  }

  // Helper methods
  updateContent(content: string, format?: ContentFormat): void {
    this.content = content;
    if (format) {
      this.contentFormat = format;
    }
  }

  addChartData(chartData: any): void {
    this.chartData = chartData;
  }

  addTableData(tableData: any): void {
    this.tableData = tableData;
  }

  setVisibility(isVisible: boolean): void {
    this.isVisible = isVisible;
  }

  setCollapsible(isCollapsible: boolean, isCollapsed = false): void {
    this.isCollapsible = isCollapsible;
    this.isCollapsed = isCollapsed;
  }

  moveToPosition(newIndex: number): void {
    this.orderIndex = newIndex;
  }

  addTag(tag: string): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    if (!this.metadata.tags) {
      this.metadata.tags = [];
    }
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.metadata?.tags) {
      this.metadata.tags = this.metadata.tags.filter((t) => t !== tag);
    }
  }

  setImportance(importance: 'low' | 'medium' | 'high' | 'critical'): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.importance = importance;
  }

  setVisibilityLevel(visibility: 'public' | 'internal' | 'confidential'): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.visibility = visibility;
  }

  updateCustomField(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    if (!this.metadata.customFields) {
      this.metadata.customFields = {};
    }
    this.metadata.customFields[key] = value;
  }

  validateSection(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title?.trim()) {
      errors.push('Section title is required');
    }

    if (!this.content?.trim()) {
      errors.push('Section content is required');
    }

    if (this.orderIndex < 0) {
      errors.push('Order index must be non-negative');
    }

    if (this.hasChartData && !this.chartData?.data) {
      errors.push('Chart data is incomplete');
    }

    if (this.hasTableData && (!this.tableData?.headers || !this.tableData?.rows)) {
      errors.push('Table data is incomplete');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  toSummary(): any {
    return {
      id: this.id,
      title: this.title,
      sectionType: this.sectionType,
      orderIndex: this.orderIndex,
      contentFormat: this.contentFormat,
      contentLength: this.contentLength,
      hasChartData: this.hasChartData,
      hasTableData: this.hasTableData,
      isVisible: this.isVisible,
      isCollapsible: this.isCollapsible,
      isCollapsed: this.isCollapsed,
      importance: this.importance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toDetailedView(): any {
    return {
      ...this.toSummary(),
      content: this.content,
      chartData: this.chartData,
      tableData: this.tableData,
      metadata: this.metadata,
    };
  }

  toPublicView(): any {
    // Return only public information, filtering out sensitive data
    const publicView = this.toDetailedView();
    
    if (this.metadata?.visibility === 'confidential') {
      delete publicView.content;
      delete publicView.chartData;
      delete publicView.tableData;
      publicView.content = '[Confidential content hidden]';
    } else if (this.metadata?.visibility === 'internal') {
      // Remove sensitive metadata but keep content
      if (publicView.metadata) {
        delete publicView.metadata.customFields;
      }
    }

    return publicView;
  }
}