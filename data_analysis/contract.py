import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os

def create_line_charts(filepath='contract.csv'):
    """
    Loads contract data and creates:
    - A 3x2 grid of line charts comparing function costs across networks (log scale).
    - A 2x3 grid of bar charts showing standard deviation of function costs across networks.
    """

    # --- 1. Data Loading ---
    try:
        df = pd.read_csv(filepath)
    except FileNotFoundError:
        print(f"Error: The file '{filepath}' was not found. Please ensure it is in the same directory.")
        return

    # --- 2. Setup for Plotting ---
    output_dir = "gas_cost_analysis_charts"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    contracts = df['Contract'].unique()
    networks = df['Network'].unique()

    # --- 3. Line Charts: Function Costs by Network ---
    fig, axes = plt.subplots(3, 2, figsize=(20, 24))
    fig.suptitle('Function Cost Comparison by Contract (Log Scale)', fontsize=20, fontweight='bold')
    axes = axes.flatten()

    for i, contract in enumerate(contracts):
        ax = axes[i]
        contract_data = df[df['Contract'] == contract]
        functions = contract_data['Function'].unique()

        for network in networks:
            network_data = contract_data[contract_data['Network'] == network].set_index('Function')
            network_data = network_data.reindex(functions)
            ax.plot(network_data.index, network_data['usd avg'], marker='o', linestyle='-', label=network)

        ax.set_title(f'{contract}', fontsize=14, fontweight='bold')
        ax.set_yscale('log')
        ax.set_ylabel('Average Cost (USD) - Log Scale', fontsize=12)
        ax.tick_params(axis='x', rotation=45, labelsize=10)
        ax.grid(True, which='both', linestyle='--', linewidth=0.5)
        ax.legend()

    for i in range(len(contracts), len(axes)):
        axes[i].set_visible(False)

    plt.tight_layout(rect=[0, 0.03, 1, 0.96])
    output_path = os.path.join(output_dir, "merged_contract_costs_line_chart.png")
    plt.savefig(output_path, dpi=300)
    print(f"\nSuccessfully generated and saved the line chart to: {output_path}")

    # --- 4. Std Dev Bar Charts: Function Cost Variability ---
    fig2, axes2 = plt.subplots(2, 3, figsize=(22, 12))
    fig2.suptitle('Function Cost Variability Across Networks (Standard Deviation)', fontsize=20, fontweight='bold')
    axes2 = axes2.flatten()

    for i, contract in enumerate(contracts):
        ax = axes2[i]
        contract_data = df[df['Contract'] == contract]
        pivot = contract_data.pivot_table(index='Function', columns='Network', values='usd avg')
        variation = pivot.std(axis=1).sort_values(ascending=False)

        variation.plot(kind='bar', ax=ax, color='skyblue', edgecolor='black')
        ax.set_title(f'{contract}', fontsize=14, fontweight='bold')
        ax.set_ylabel('Standard Deviation (USD)', fontsize=12)
        ax.tick_params(axis='x', rotation=45, labelsize=10)
        ax.grid(True, axis='y', linestyle='--', linewidth=0.5)

    for i in range(len(contracts), len(axes2)):
        axes2[i].set_visible(False)

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    bar_output_path = os.path.join(output_dir, "function_cost_variability_stddev_chart.png")
    plt.savefig(bar_output_path, dpi=300)
    print(f"Successfully generated and saved the std deviation chart to: {bar_output_path}")

# Run the function
create_line_charts('contract.csv')
