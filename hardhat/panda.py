import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def generate_cost_visualizations():
    # --- 1. Load and Prepare Data ---
    try:
        # Load the dataset, skipping any malformed lines
        df = pd.read_csv('output.csv', on_bad_lines='skip')
        print("CSV file loaded successfully.")
    except FileNotFoundError:
        print("Error: output.csv not found. Please ensure the file is in the correct directory.")
        return

    # Convert 'USD Avg' to a numeric type, coercing errors to NaN
    df['USD Avg'] = pd.to_numeric(df['USD Avg'], errors='coerce')
    # Drop rows where USD cost is not available, as it's essential for the plots
    df.dropna(subset=['USD Avg'], inplace=True)

    # Set a professional and clean plot style
    sns.set_style("whitegrid")
    plt.rcParams['figure.figsize'] = (16, 10)
    plt.rcParams['font.size'] = 12

    # --- 2. Chart 1: Total Execution Cost per Function (Stacked Bar) ---

    # Filter out 'deployment' costs to focus on recurring execution costs
    execution_df = df[df['Method'] != 'deployment'].copy()

    # Group by function (Method) and Network, then sum the USD costs
    total_cost_by_function = execution_df.groupby(['Method', 'Network'])['USD Avg'].sum().reset_index()

    # Pivot the data to prepare for stacking: Methods as columns, Networks as index
    pivot_execution = total_cost_by_function.pivot(index='Method', columns='Network', values='USD Avg').fillna(0)

    # Plotting the stacked bar chart
    ax1 = pivot_execution.plot(kind='bar', stacked=True, colormap='viridis', width=0.8)

    plt.title('Total Execution Cost per Function (USD)', fontsize=18, fontweight='bold')
    plt.xlabel('Function (Method)', fontsize=14)
    plt.ylabel('Total Cost (USD) - Log Scale', fontsize=14)
    plt.xticks(rotation=45, ha='right')
    plt.legend(title='L2 Network')

    # Use a logarithmic scale to handle large variations in cost
    ax1.set_yscale('log')
    # Adjust y-axis formatting for better readability on a log scale
    ax1.get_yaxis().set_major_formatter(plt.FuncFormatter(lambda x, loc: "${:,.4f}".format(x)))


    plt.tight_layout()
    plt.savefig('total_execution_cost_by_function.png')
    plt.close()
    print("Chart 'total_execution_cost_by_function.png' saved successfully.")


    # --- 3. Chart 2: Deployment Cost per Contract (Stacked Bar) ---

    # Filter the DataFrame to only include 'deployment' methods
    deployment_df = df[df['Method'] == 'deployment'].copy()

    # Pivot the data: Contracts as index, Networks as columns, USD Avg as values
    pivot_deployment = deployment_df.pivot(index='Contract', columns='Network', values='USD Avg').fillna(0)

    # Plotting the stacked bar chart
    ax2 = pivot_deployment.plot(kind='bar', stacked=True, colormap='plasma', width=0.8)

    plt.title('Deployment Cost per Contract (USD)', fontsize=18, fontweight='bold')
    plt.xlabel('Smart Contract', fontsize=14)
    plt.ylabel('Deployment Cost (USD) - Log Scale', fontsize=14)
    plt.xticks(rotation=45, ha='right')
    plt.legend(title='L2 Network')

    # Use a logarithmic scale to clearly see all deployment costs
    ax2.set_yscale('log')
    ax2.get_yaxis().set_major_formatter(plt.FuncFormatter(lambda x, loc: "${:,.2f}".format(x)))


    plt.tight_layout()
    plt.savefig('deployment_cost_by_contract.png')
    plt.close()
    print("Chart 'deployment_cost_by_contract.png' saved successfully.")


if __name__ == '__main__':
    generate_cost_visualizations()
