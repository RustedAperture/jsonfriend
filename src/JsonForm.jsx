import React, { useEffect, useState, useCallback } from 'react';
import JsonFormField from './components/JsonFormField.jsx';

function JsonForm() {
    const [jsonData, setJsonData] = useState({});
    const [rawJson, setRawJson] = useState('');
    const [availablePaths, setAvailablePaths] = useState([]);
    const [approvedKeys, setApprovedKeys] = useState(['*']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const extractPaths = useCallback((obj, parentPath = '') => {
        const paths = ['*'];
        
        const traverse = (obj, path) => {
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    const currentPath = path ? `${path}.${index}` : `${index}`;
                    paths.push(currentPath);
                    
                    if (item && typeof item === 'object') {
                        traverse(item, currentPath);
                    }
                });
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    paths.push(currentPath);
                    
                    if (value && typeof value === 'object') {
                        traverse(value, currentPath);
                    }
                });
            }
        };
        
        traverse(obj, parentPath);
        return paths.filter((path, index) => paths.indexOf(path) === index);
    }, []);

    useEffect(() => {
        fetch(import.meta.env.BASE_URL + 'data.json')
            .then(response => response.ok ? response.json() : Promise.reject('Failed to fetch'))
            .then(data => {
                setJsonData(data);
                setRawJson(JSON.stringify(data, null, 4));
                setAvailablePaths(extractPaths(data));
            })
            .catch(error => console.error('Error loading JSON data:', error))
            .finally(() => setLoading(false));
    }, [extractPaths]);
    
    useEffect(() => {
        const textarea = document.querySelector('.json-output');
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }, [rawJson]);

    const handleApprovedKeysChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        setApprovedKeys(selectedOptions);
    };

    const convertValue = (originalValue, newValue) => {
        if (typeof originalValue === 'number') {
            return newValue === '' ? 0 : Number(newValue);
        }
        if (typeof originalValue === 'boolean') {
            return typeof newValue === 'boolean' ? newValue : newValue === 'true';
        }
        return newValue;
    };
    
    const handleInputChange = (keyPath, value) => {
        setJsonData(prevData => {
            const updatedData = { ...prevData };
            let current = updatedData;
            
            const originalValue = keyPath.reduce((obj, key) => obj[key], prevData);
            const convertedValue = convertValue(originalValue, value);
            
            keyPath.slice(0, -1).forEach(key => {
                current = current[key];
            });
            current[keyPath[keyPath.length - 1]] = convertedValue;
            
            setRawJson(JSON.stringify(updatedData, null, 4));
            return updatedData;
        });
    };

    const handleJsonChange = (e) => {
        const newRawJson = e.target.value;
        setRawJson(newRawJson);
    
        try {
            const updatedJson = JSON.parse(newRawJson);
            setJsonData(updatedJson);
            setAvailablePaths(extractPaths(updatedJson));
            setError(null);
        } catch (error) {
            setError(error.message);
        }
    };

    const isPathApproved = (path) => {
        if (approvedKeys.includes('*')) return true;
        const pathString = path.join('.');
        return approvedKeys.some(approvedKey => {
            if (pathString === approvedKey) return true;
            if (approvedKey.startsWith(pathString + '.')) return true;
            if (pathString.startsWith(approvedKey + '.')) return true;
            return false;
        });
    };

    const renderFields = (data, keyPath = [], isRoot = true) => {
        const formatKeyName = (key) => {
            return key
                .split(/(?=[A-Z])|_|\s/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        };
    
        
        const hasDirectlyApprovedChildren = (obj, objPath) => {
            const traverse = (value, path) => {
                if (typeof value !== 'object' || value === null) {
                    return isPathApproved(path);
                }

                return Object.entries(value).some(([key, val]) => {
                    const newPath = [...path, key];
                    if (isPathApproved(newPath)) return true;
                    return traverse(val, newPath);
                });
            };

            return traverse(obj, objPath);
        };
        
        const fields = Object.entries(data).reduce((acc, [key, value]) => {
            const currentPath = [...keyPath, key];
            
            if (isPathApproved(currentPath)) {
                acc.push([key, value]);
                return acc;
            }
        
            if (typeof value === 'object' && value !== null) {
                // Check both direct children and nested paths
                const hasApprovedFields = Object.keys(value).some(childKey => {
                    const childPath = [...currentPath, childKey];
                    const childValue = value[childKey];
                    
                    return isPathApproved(childPath) || 
                           (typeof childValue === 'object' && childValue !== null && 
                            hasDirectlyApprovedChildren(childValue, childPath));
                });
                
                if (hasApprovedFields) {
                    acc.push([key, value]);
                }
            }
            
            return acc;
        }, []);
    
        const renderField = ([key, value], path) => {
            const currentPath = [...path, key];
            const currentPathString = currentPath.join('.');
            const displayKey = formatKeyName(key);
        
            if (Array.isArray(value)) {
                const hasApprovedFields = value.some((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        return hasDirectlyApprovedChildren(item, [...currentPath, index]);
                    }
                    return isPathApproved([...currentPath, index]);
                });
        
                if (!hasApprovedFields) {
                    return null;
                }
        
                return (
                    <>
                        <h4>
                            {displayKey}
                        </h4>
                        {value.map((item, index) => {
                            const itemPath = [...currentPath, index];
                            // Only render if the specific index is approved or has approved children
                            if (isPathApproved(itemPath) || 
                                (typeof item === 'object' && item !== null && hasDirectlyApprovedChildren(item, itemPath))) {
                                return (
                                    <>
                                        <h4>
                                            Item {index + 1}
                                        </h4>
                                        <div className='flex flex-col gap-1'>
                                            {renderFields(item, itemPath, false)}
                                        </div>
                                    </>
                                );
                            }
                            return null;
                        })}
                    </>
                );
            }
    
            if (typeof value === 'object' && value !== null) {
                const hasApprovedFields = hasDirectlyApprovedChildren(value, currentPath);
        
                if (hasApprovedFields) {
                    return (
                        <>
                            <h4>
                                {displayKey}
                            </h4>
                            {renderFields(value, currentPath, false)}
                        </>
                    );
                }
                return null;
            }
    
            if (isPathApproved(currentPath)) {
                return (
                    <JsonFormField
                        key={currentPathString}
                        path={currentPath}
                        value={value}
                        label={displayKey}
                        onChange={handleInputChange}
                    />
                );
            }
            return null;
        };
    
        return (
            <>
                {fields.map(field => renderField(field, keyPath))}
            </>
        );
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2>JSON Form Editor</h2>
            <hr className='not-prose text-gray-400'/>
            <div className='flex flex-wrap gap-4'>
                <div className='basis-lg flex flex-col gap-1'>
                    <h3>JSON Fields</h3>
                    {renderFields(jsonData)}
                    
                </div>
                <div className='grow flex flex-col gap-1'>
                    <h3>JSON Input/Output</h3>
                    <textarea
                        className="json-output w-full rounded-sm border-2 border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                        value={rawJson}
                        onChange={handleJsonChange}
                        wrap='off'
                    />
                    {error && <div className='text-sm text-red-400'>Invalid JSON: {error}</div>}
                    <h3>Visible Keys</h3>
                    <select
                        multiple
                        value={approvedKeys}
                        onChange={handleApprovedKeysChange}
                        className='p-2 w-full grow rounded-sm border-2 border-gray-300 focus:ring-gray-500 focus:border-gray-500'
                    >
                        {availablePaths.map((path) => (
                            <option className='px-2 py-1' key={path} value={path}>
                                {path}
                            </option>
                        ))}
                    </select>
                    <div className='text-sm text-gray-500'>
                        Hold Ctrl (Cmd on Mac) to select multiple keys
                    </div>
                </div>
            </div>
        </div>
    );
}

export default JsonForm;