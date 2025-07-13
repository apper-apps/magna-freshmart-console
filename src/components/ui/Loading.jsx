import React from 'react';

const Loading = ({ type = 'products' }) => {
  const ProductSkeleton = () => (
    <div className="card p-4 animate-pulse">
      <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
      <div className="bg-gray-200 h-3 rounded w-1/2 mb-2"></div>
      <div className="bg-gray-200 h-6 rounded w-1/3"></div>
    </div>
  );

  const OrderSkeleton = () => (
    <div className="card p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-gray-200 h-5 rounded w-32"></div>
        <div className="bg-gray-200 h-6 rounded-full w-20"></div>
      </div>
      <div className="bg-gray-200 h-4 rounded w-full mb-2"></div>
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
      <div className="bg-gray-200 h-4 rounded w-1/2"></div>
    </div>
  );

  const TableSkeleton = () => (
    <div className="card p-6 animate-pulse">
      <div className="bg-gray-200 h-6 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="bg-gray-200 h-4 rounded w-16"></div>
            <div className="bg-gray-200 h-4 rounded w-32"></div>
            <div className="bg-gray-200 h-4 rounded w-24"></div>
            <div className="bg-gray-200 h-4 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="bg-gray-200 h-8 rounded w-16 mb-2"></div>
            <div className="bg-gray-200 h-6 rounded w-24"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-32 mb-4"></div>
          <div className="bg-gray-200 h-64 rounded"></div>
        </div>
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-4 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
);

  const FinancialSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="bg-gray-200 h-4 rounded w-24 mb-2"></div>
            <div className="bg-gray-200 h-8 rounded w-32 mb-2"></div>
            <div className="bg-gray-200 h-3 rounded w-16"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-40 mb-4"></div>
          <div className="bg-gray-200 h-80 rounded"></div>
        </div>
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-36 mb-4"></div>
          <div className="bg-gray-200 h-80 rounded"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="bg-gray-200 h-6 rounded w-32 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="bg-gray-200 h-4 rounded w-full"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSkeletons = () => {
    switch (type) {
      case 'products':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        );
      case 'orders':
        return (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        );
case 'table':
        return <TableSkeleton />;
      case 'dashboard':
        return <DashboardSkeleton />;
      case 'financial':
        return <FinancialSkeleton />;
      case 'page':
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading page...</p>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center p-8">
              <div className="animate-pulse bg-red-100 rounded-full h-16 w-16 mx-auto mb-4 flex items-center justify-center">
                <div className="h-8 w-8 bg-red-300 rounded-full"></div>
              </div>
              <p className="text-red-600">Loading failed, attempting recovery...</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {renderSkeletons()}
    </div>
  );
};
export default Loading;