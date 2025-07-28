import React from "react";
import ProductCard from "@/components/molecules/ProductCard";
import Loading from "@/components/ui/Loading";
import Error from "@/components/ui/Error";
import { VirtualizedProductList } from "@/components/ui/VirtualizedList";
import Empty from "@/components/ui/Empty";

const ProductGrid = ({ 
  products, 
  loading, 
  error, 
  onRetry, 
  emptyMessage = "No products found",
  ...props 
}) => {
  if (loading) {
    return <Loading type="products" />;
  }

  if (error) {
    return <Error message={error} onRetry={onRetry} />;
  }

  if (!products || products.length === 0) {
    return (
      <Empty 
        type="products" 
        description={emptyMessage}
        onAction={onRetry}
        action="Refresh"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6" {...props}>
      {products.length > 20 ? (
        <VirtualizedProductList 
          products={products}
          renderItem={(product, index) => (
            <ProductCard
              key={product.id || index}
              product={product}
              loading={index < 12 ? "eager" : "lazy"}
              virtualIndex={index}
            />
          )}
          itemHeight={280}
          containerHeight={600}
        />
      ) : (
        products.map((product, index) => (
          <ProductCard
            key={product.id || index} 
            product={product}
            loading={index < 8 ? "eager" : "lazy"}
            virtualIndex={index}
          />
        ))
      )}
    </div>
  );
};

export default ProductGrid;