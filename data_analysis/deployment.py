import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# --- Data Loading and Cleaning ---
# Read the CSV file
# Create a dummy CSV for demonstration if the file doesn't exist
try:
    df = pd.read_csv('deploymentgasestimation.csv')
except FileNotFoundError:
    print("deploymentgasestimation.csv not found. Creating a dummy dataframe for demonstration.")
    data = {
        'Contract': ['ERC20', 'ERC20', 'ERC20', 'ERC721', 'ERC721', 'ERC721', 'ERC1155', 'ERC1155', 'ERC1155', 'Proxy', 'Proxy', 'Proxy', 'Vesting', 'Vesting', 'Vesting', 'DAO', 'DAO', 'DAO'],
        'Network': ['Ethereum', 'Polygon', 'Arbitrum', 'Ethereum', 'Polygon', 'Arbitrum', 'Ethereum', 'Polygon', 'Arbitrum', 'Ethereum', 'Polygon', 'Arbitrum', 'Ethereum', 'Polygon', 'Arbitrum', 'Ethereum', 'Polygon', 'Arbitrum'],
        'Est. Deployment Cost (USD)': ['$55.20', '$0.08', '$0.95', '$120.50', '$0.15', '$1.50', '$150.75', '$0.20', '$2.10', '$80.00', '$0.12', '$1.20', '$95.30', '$0.14', '$1.35', '$250.00', '$0.30', '$3.00']
    }
    df = pd.DataFrame(data)


# Clean the data: remove '$' and convert to float
df['Est. Deployment Cost (USD)'] = df['Est. Deployment Cost (USD)'].replace({'\$': ''}, regex=True).astype(float)

# --- Ethereum Cost Analysis and Comparison Table ---

# Isolate Ethereum data to use as a baseline
ethereum_df = df[df['Network'] == 'Ethereum'].copy()

# Calculate total and average cost on Ethereum
total_ethereum_cost = ethereum_df['Est. Deployment Cost (USD)'].sum()
average_ethereum_cost = ethereum_df['Est. Deployment Cost (USD)'].mean()

print("--- Ethereum Deployment Cost Summary ---")
print(f"Total Estimated Cost for all contracts on Ethereum: ${total_ethereum_cost:,.2f}")
print(f"Average Estimated Cost for a contract on Ethereum: ${average_ethereum_cost:,.2f}")
print("-" * 40)


# Create a dictionary for easy lookup of Ethereum costs by contract
ethereum_cost_map = ethereum_df.set_index('Contract')['Est. Deployment Cost (USD)'].to_dict()

# Filter for other networks to compare against Ethereum
comparison_df = df[df['Network'] != 'Ethereum'].copy()

# Add the corresponding Ethereum cost to each row for comparison
comparison_df['Ethereum Cost (USD)'] = comparison_df['Contract'].map(ethereum_cost_map)

# Calculate the discount vs Ethereum in USD and percentage
comparison_df['Discount (USD)'] = comparison_df['Ethereum Cost (USD)'] - comparison_df['Est. Deployment Cost (USD)']
comparison_df['Discount (%)'] = (comparison_df['Discount (USD)'] / comparison_df['Ethereum Cost (USD)']) * 100

# Display the final comparison table
print("\n--- Deployment Cost Comparison vs. Ethereum ---")
# Format the table for better readability
formatted_table = comparison_df[[
    'Contract', 
    'Network', 
    'Est. Deployment Cost (USD)', 
    'Ethereum Cost (USD)', 
    'Discount (USD)', 
    'Discount (%)'
]].sort_values(by=['Contract', 'Est. Deployment Cost (USD)']).reset_index(drop=True)

formatted_table['Est. Deployment Cost (USD)'] = formatted_table['Est. Deployment Cost (USD)'].apply(lambda x: f"${x:,.4f}")
formatted_table['Ethereum Cost (USD)'] = formatted_table['Ethereum Cost (USD)'].apply(lambda x: f"${x:,.2f}")
formatted_table['Discount (USD)'] = formatted_table['Discount (USD)'].apply(lambda x: f"${x:,.2f}")
formatted_table['Discount (%)'] = formatted_table['Discount (%)'].apply(lambda x: f"{x:.2f}%")

print(formatted_table.to_string())
print("\n" + "="*80 + "\n")


# --- Visualizations (Comparing Non-Ethereum Networks) ---

# Exclude Ethereum from the visualization part of the analysis
df_filtered = df[df['Network'] != 'Ethereum'].copy()

# Get unique contracts and networks for plotting
contracts = df_filtered['Contract'].unique()
networks = df_filtered['Network'].unique()

# Set up color palette
colors = plt.cm.Set3(np.linspace(0, 1, len(networks)))
network_colors = dict(zip(networks, colors))

# Create figure with 3x2 subplots for bar charts
fig1, axes1 = plt.subplots(3, 2, figsize=(15, 12))
fig1.suptitle('Deployment Cost by Contract (Log Scale)', fontsize=16, fontweight='bold')


# Flatten axes for easier iteration
axes1_flat = axes1.flatten()

# Create bar charts for each contract
for i, contract in enumerate(contracts):
    ax = axes1_flat[i]
    contract_data = df_filtered[df_filtered['Contract'] == contract]
    
    # Sort by deployment cost for better visualization
    contract_data = contract_data.sort_values('Est. Deployment Cost (USD)')
    
    bars = ax.bar(range(len(contract_data)), 
                  contract_data['Est. Deployment Cost (USD)'],
                  color=[network_colors.get(net, '#808080') for net in contract_data['Network']])
    
    ax.set_title(f'{contract}', fontweight='bold', fontsize=12)
    ax.set_ylabel('Deployment Cost (USD) - Log Scale', fontsize=10)
    ax.set_yscale('log')  # Use logarithmic scale
    ax.set_xticks(range(len(contract_data)))
    ax.set_xticklabels(contract_data['Network'], rotation=45, ha='right', fontsize=9)
    
    # Add value labels on bars
    for j, (bar, cost) in enumerate(zip(bars, contract_data['Est. Deployment Cost (USD)'])):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height * 1.1,  # Adjust position for log scale
                f'${cost:.6f}' if cost < 0.001 else (f'${cost:.4f}' if cost < 1 else f'${cost:.2f}'),
                ha='center', va='bottom', fontsize=8, rotation=90)
    
    ax.grid(True, alpha=0.3, which='both')  # Show both major and minor grid lines

# Hide any unused subplots
for i in range(len(contracts), len(axes1_flat)):
    axes1_flat[i].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.96])
plt.savefig('deployment_costs_bar_charts.png', dpi=300, bbox_inches='tight')
plt.show()

# Create figure with 3x2 subplots for line charts
fig2, axes2 = plt.subplots(3, 2, figsize=(15, 12))
fig2.suptitle('Deployment Cost Ranking by Contract (Log Scale)', fontsize=16, fontweight='bold')


# Flatten axes for easier iteration
axes2_flat = axes2.flatten()

# Create line charts for each contract
for i, contract in enumerate(contracts):
    ax = axes2_flat[i]
    contract_data = df_filtered[df_filtered['Contract'] == contract]
    
    # Sort by deployment cost for better visualization
    contract_data = contract_data.sort_values('Est. Deployment Cost (USD)')
    
    ax.plot(range(len(contract_data)), 
            contract_data['Est. Deployment Cost (USD)'],
            marker='o', linewidth=2, markersize=8, color='steelblue', zorder=4)
    
    # Color each point based on network
    for j, (idx, row) in enumerate(contract_data.iterrows()):
        ax.scatter(j, row['Est. Deployment Cost (USD)'], 
                   color=network_colors.get(row['Network'], '#808080'), s=100, zorder=5)
    
    ax.set_title(f'{contract}', fontweight='bold', fontsize=12)
    ax.set_ylabel('Deployment Cost (USD) - Log Scale', fontsize=10)
    ax.set_yscale('log')  # Use logarithmic scale
    ax.set_xticks(range(len(contract_data)))
    ax.set_xticklabels(contract_data['Network'], rotation=45, ha='right', fontsize=9)
    
    # Add value labels on points
    for j, (idx, row) in enumerate(contract_data.iterrows()):
        cost = row['Est. Deployment Cost (USD)']
        ax.annotate(f'${cost:.6f}' if cost < 0.001 else (f'${cost:.4f}' if cost < 1 else f'${cost:.2f}'),
                      (j, cost), textcoords="offset points", 
                      xytext=(0,15), ha='center', fontsize=8)  # Increased offset for log scale
    
    ax.grid(True, alpha=0.3, which='both')  # Show both major and minor grid lines

# Hide any unused subplots
for i in range(len(contracts), len(axes2_flat)):
    axes2_flat[i].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.96])
plt.savefig('deployment_costs_line_charts.png', dpi=300, bbox_inches='tight')
plt.show()

# Create a summary comparison chart
plt.figure(figsize=(16, 10))

# Calculate average deployment cost per network across all contracts
network_avg_costs = df_filtered.groupby('Network')['Est. Deployment Cost (USD)'].mean().sort_values()

# Create a comprehensive comparison
fig3, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 8))
fig3.suptitle('Overall Deployment Cost Analysis (Non-Ethereum Networks)', fontsize=16, fontweight='bold')


# Left plot: Average deployment cost per network
bars = ax1.bar(range(len(network_avg_costs)), network_avg_costs.values,
               color=[network_colors.get(net, '#808080') for net in network_avg_costs.index])
ax1.set_title('Average Deployment Cost by Network\n(Across All Contracts)', fontweight='bold', fontsize=14)
ax1.set_ylabel('Average Deployment Cost (USD)', fontsize=12)
ax1.set_xticks(range(len(network_avg_costs)))
ax1.set_xticklabels(network_avg_costs.index, rotation=45, ha='right', fontsize=11)

# Add value labels
for bar, cost in zip(bars, network_avg_costs.values):
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height,
             f'${cost:.4f}' if cost < 1 else f'${cost:.2f}',
             ha='center', va='bottom', fontsize=10)

ax1.grid(True, alpha=0.3)

# Right plot: Cost distribution by contract type
contract_data_for_plot = []
contract_labels = []
for contract in contracts:
    contract_costs = df_filtered[df_filtered['Contract'] == contract]['Est. Deployment Cost (USD)'].values
    contract_data_for_plot.append(contract_costs)
    contract_labels.append(contract)

bp = ax2.boxplot(contract_data_for_plot, labels=contract_labels, patch_artist=True)
ax2.set_title('Deployment Cost Distribution by Contract Type\n(Across All Networks)', fontweight='bold', fontsize=14)
ax2.set_ylabel('Deployment Cost (USD)', fontsize=12)
ax2.set_xticklabels(contract_labels, rotation=45, ha='right', fontsize=11)

# Color the boxplots
colors_box = plt.cm.Set2(np.linspace(0, 1, len(contracts)))
for patch, color in zip(bp['boxes'], colors_box):
    patch.set_facecolor(color)
    patch.set_alpha(0.7)

ax2.grid(True, alpha=0.3)

plt.tight_layout(rect=[0, 0, 1, 0.95])
plt.savefig('deployment_costs_summary.png', dpi=300, bbox_inches='tight')
plt.show()

# --- Final Enhanced Summary Statistics ---
print("\n=== DEPLOYMENT COST ANALYSIS SUMMARY ===")

# Create a summary DataFrame from the average costs of non-Ethereum networks
summary_df = network_avg_costs.to_frame(name='Avg. Cost (USD)')

# Calculate difference and discount compared to Ethereum's average cost
summary_df['Cost Difference (USD)'] = average_ethereum_cost - summary_df['Avg. Cost (USD)']
summary_df['Discount (%)'] = (summary_df['Cost Difference (USD)'] / average_ethereum_cost) * 100

# Add Ethereum's average cost to the table for a complete view
eth_row = pd.DataFrame({
    'Avg. Cost (USD)': [average_ethereum_cost], 
    'Cost Difference (USD)': [0], 
    'Discount (%)': [0]
}, index=['Ethereum'])

# Combine and sort by average cost
final_summary_df = pd.concat([summary_df, eth_row]).sort_values('Avg. Cost (USD)')

# Format for printing
final_summary_df_formatted = final_summary_df.copy()
final_summary_df_formatted.index.name = "Network"
final_summary_df_formatted['Avg. Cost (USD)'] = final_summary_df_formatted['Avg. Cost (USD)'].apply(lambda x: f"${x:,.6f}")
final_summary_df_formatted['Cost Difference (USD)'] = final_summary_df_formatted['Cost Difference (USD)'].apply(lambda x: f"${x:,.6f}")
final_summary_df_formatted['Discount (%)'] = final_summary_df_formatted['Discount (%)'].apply(lambda x: f"{x:.2f}%")

print("\n--- Average Deployment Cost by Network (Compared to Ethereum) ---")
print(final_summary_df_formatted.to_string())

# Keep the other summary sections, clarifying they are for non-ETH networks
print("\nCheapest deployment options by contract (Non-Ethereum):")
for contract in contracts:
    contract_data = df_filtered[df_filtered['Contract'] == contract]
    cheapest = contract_data.loc[contract_data['Est. Deployment Cost (USD)'].idxmin()]
    print(f"{contract:15}: {cheapest['Network']} (${cheapest['Est. Deployment Cost (USD)']:.6f})")

print("\nMost expensive deployment options by contract (Non-Ethereum):")
for contract in contracts:
    contract_data = df_filtered[df_filtered['Contract'] == contract]
    most_expensive = contract_data.loc[contract_data['Est. Deployment Cost (USD)'].idxmax()]
    print(f"{contract:15}: {most_expensive['Network']} (${most_expensive['Est. Deployment Cost (USD)']:.2f})")
