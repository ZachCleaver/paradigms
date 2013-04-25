def map(list, func):
    for i in range(len(list)):
        list[i]=func(list[i])
list=range(1000)
map(list, lambda f:f*f)
print list
