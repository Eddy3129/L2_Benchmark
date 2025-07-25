import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def analyze_gas_costs(filepath='contract.csv'):
    """
    Analyzes and visualizes gas cost data from a CSV file.

    This function performs a comprehensive analysis of gas costs for different
    blockchain networks and smart contract functions. It generates and saves
    several focused visualizations and prints a detailed statistical summary.

    Args:
        filepath (str): The path to the CSV file containing the gas cost data.
    """
    # --- 1. Data Loading and Preparation ---
    try:
        df = pd.read_csv(filepath)
    except FileNotFoundError:
        print(f"Error: The file '{filepath}' was not found.")
        return

    # --- 2. Setup for Plotting and Analysis ---
    output_dir = "gas_cost_analysis_charts"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    sns.set_theme(style="whitegrid", palette="viridis")
    plt.rcParams['figure.dpi'] = 300
    plt.rcParams['savefig.dpi'] = 300

    # --- 3. Generate Focused Visualizations ---

    # A. Merged 3x2 Grid of Grouped Bar Charts
    print("Generating merged 3x2 grid of bar charts...")
    contracts = df['Contract'].unique()

    fig, axes = plt.subplots(3, 2, figsize=(24, 28))
    fig.suptitle('Side-by-Side Cost Comparison Across All Contracts', fontsize=24, fontweight='bold', y=0.98)
    axes = axes.flatten()

    for i, contract in enumerate(contracts):
        if i < len(axes):
            ax = axes[i]
            contract_data = df[df['Contract'] == contract]

            sns.barplot(data=contract_data, x='Function', y='usd avg', hue='Network', palette='viridis', ax=ax)

            ax.set_title(f'Cost Comparison for {contract}', fontsize=16, fontweight='bold', pad=15)
            ax.set_xlabel('Function', fontsize=12)
            ax.set_ylabel('Average Cost (USD)', fontsize=12)
            ax.legend(title='Network', fontsize=10)
            
            # --- COMPLETELY NEW IMPLEMENTATION FOR LABELS ---
            # Loop through each label and set its properties individually.
            for label in ax.get_xticklabels():
                label.set_rotation(45)
                label.set_ha('right') # 'ha' is the alias for horizontalalignment
                label.set_fontsize(10)
    
    # Hide any unused subplots
    for j in range(i + 1, len(axes)):
        fig.delaxes(axes[j])

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    merged_chart_path = os.path.join(output_dir, 'merged_contract_cost_comparison.png')
    plt.savefig(merged_chart_path)
    plt.close(fig)
    print(f"Saved merged contract chart to '{merged_chart_path}'")

    # B. Heatmap of Average Costs
    print("\nGenerating cost heatmap...")
    plt.figure(figsize=(12, 10))
    pivot_data = df.pivot_table(values='usd avg', index='Function', columns='Network', aggfunc='mean')
    ax_heatmap = sns.heatmap(pivot_data, annot=False, cmap='viridis', linewidths=.5, cbar_kws={'label': 'Average Cost (USD)'})
    ax_heatmap.set_title('Heatmap of Average Transaction Costs (USD)', fontsize=16, fontweight='bold', pad=20)
    ax_heatmap.set_xlabel('Network', fontsize=12, fontweight='bold')
    ax_heatmap.set_ylabel('Function', fontsize=12, fontweight='bold')
    
    # Apply new label implementation
    for label in ax_heatmap.get_xticklabels():
        label.set_rotation(45)
        label.set_ha('right')
    
    plt.tight_layout()
    heatmap_path = os.path.join(output_dir, 'cost_heatmap.png')
    plt.savefig(heatmap_path)
    plt.close()
    print(f"Saved heatmap to '{heatmap_path}'")

    # C. Box Plot of Cost Distributions
    print("\nGenerating cost distribution box plot...")
    plt.figure(figsize=(12, 8))
    ax_box = sns.boxplot(data=df, x='Network', y='usd avg', palette='viridis')
    ax_box.set_yscale('log')
    ax_box.set_title('Distribution of Transaction Costs by Network (Log Scale)', fontsize=16, fontweight='bold', pad=20)
    ax_box.set_xlabel('Network', fontsize=12, fontweight='bold')
    ax_box.set_ylabel('Average Cost (USD) - Log Scale', fontsize=12, fontweight='bold')
    
    # Apply new label implementation
    for label in ax_box.get_xticklabels():
        label.set_rotation(45)
        label.set_ha('right')
        
    plt.tight_layout()
    boxplot_path = os.path.join(output_dir, 'cost_distribution_boxplot.png')
    plt.savefig(boxplot_path)
    plt.close()
    print(f"Saved box plot to '{boxplot_path}'")

    # --- 4. Deeper Summary Analysis ---
    print("\n" + "=" * 80)
    print("GAS COST STATISTICAL SUMMARY")
    print("=" * 80)
    
    # A. Network Efficiency Ranking
    print("\n1. NETWORK COST EFFICIENCY RANKING (Lowest Average Cost First):")
    print("-" * 60)
    network_avg = df.groupby('Network')['usd avg'].mean().sort_values()
    for rank, (network, cost) in enumerate(network_avg.items(), 1):
        print(f"  {rank}. {network:<15} - Average Cost: ${cost:.6f}")

    # B. Most & Least Expensive Operations
    print("\n2. OVERALL MOST & LEAST EXPENSIVE OPERATIONS:")
    print("-" * 60)
    most_expensive = df.loc[df['usd avg'].idxmax()]
    least_expensive = df.loc[df['usd avg'].idxmin()]
    print(f"  - Most Expensive: {most_expensive['Network']} - {most_expensive['Contract']}/{most_expensive['Function']} (${most_expensive['usd avg']:.6f})")
    print(f"  - Least Expensive: {least_expensive['Network']} - {least_expensive['Contract']}/{least_expensive['Function']} (${least_expensive['usd avg']:.6f})")

    # C. Most Expensive Operation per Network
    print("\n3. MOST EXPENSIVE OPERATION PER NETWORK:")
    print("-" * 60)
    most_expensive_per_network = df.loc[df.groupby('Network')['usd avg'].idxmax()]
    for _, row in most_expensive_per_network.iterrows():
        print(f"  - {row['Network']:<15}: {row['Contract']}/{row['Function']} (${row['usd avg']:.6f})")

    print("\n" + "=" * 80)
    print("Analysis complete. All charts have been exported.")
    print("=" * 80)

# Run the analysis
analyze_gas_costs('contract.csv')