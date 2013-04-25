def map(a, func):
	result = []
	for i in range(len(a)):
		result.append(func(a[i]))
	return result	
	
print (map(range(1000), lambda x: x*x))